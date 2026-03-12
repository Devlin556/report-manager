import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Piscina from 'piscina';
import * as path from 'path';
import { Observable } from 'rxjs';
import { ConfigService } from '../../config/config.service';
import { RedisService } from '../../infra/redis/redis.service';
import { S3Service } from '../../infra/s3/s3.service';
import { ReportTemplatesService } from '../report-templates/report-templates.service';
import { ReportDataService } from '../report-data/report-data.service';
import { Report, ReportStatus } from '../reports/entities/report.entity';
import { LoggerService } from '../../logger/logger.service';

export type StatusPayload = { status: ReportStatus; s3Key?: string };

const statusKey = (id: string) => `report:${id}:status`;
const statusChannel = (id: string) => `report:${id}:updates`;

const CONTENT_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const PISCINA_OPTIONS = { minThreads: 0, maxThreads: 4 };

@Injectable()
export class ReportWorkerManagerService implements OnModuleDestroy {
  private readonly logger = LoggerService.create(ReportWorkerManagerService.name);

  private readonly pdfPool: Piscina;
  private readonly xlsxPool: Piscina;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly s3: S3Service,
    private readonly templates: ReportTemplatesService,
    private readonly data: ReportDataService,
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
  ) {
    this.pdfPool = new Piscina({
      filename: path.join(__dirname, 'workers', 'pdf.worker.js'),
      ...PISCINA_OPTIONS,
    });
    this.xlsxPool = new Piscina({
      filename: path.join(__dirname, 'workers', 'xlsx.worker.js'),
      ...PISCINA_OPTIONS,
    });
  }

  async startGeneration(type: string, format: string): Promise<string> {
    const report = this.reportRepo.create({ type, format, status: 'pending' });
    await this.reportRepo.save(report);
    await this.setStatus(report.id, { status: 'pending' });

    setImmediate(() => void this.runGeneration(report.id, type, format));
    return report.id;
  }

  async getStatus(reportId: string): Promise<StatusPayload | null> {
    const raw = await this.redis.get(statusKey(reportId));
    return raw ? (JSON.parse(raw) as StatusPayload) : null;
  }

  statusStream(reportId: string): Observable<StatusPayload> {
    const channel = statusChannel(reportId);
    const client = this.redis.getClient().duplicate();

    return new Observable<StatusPayload>((subscriber) => {
      client.subscribe(channel).then(() => {
        client.on('message', (_ch: string, message: string) => {
          subscriber.next(JSON.parse(message) as StatusPayload);
        });
      });

      return () => {
        client.unsubscribe(channel).then(() => client.quit());
      };
    });
  }

  /** Стрим обновлений для всех отчётов (pending/processing). PSUBSCRIBE report:*:updates */
  statusStreamAll(): Observable<{ reportId: string } & StatusPayload> {
    const client = this.redis.getClient().duplicate();
    const pattern = 'report:*:updates';

    return new Observable<{ reportId: string } & StatusPayload>((subscriber) => {
      client.psubscribe(pattern).then(() => {
        client.on('pmessage', (_pattern: string, ch: string, message: string) => {
          const reportId = ch.replace(/^report:(.+):updates$/, '$1');
          if (reportId && reportId !== ch) {
            const payload = JSON.parse(message) as StatusPayload;
            subscriber.next({ reportId, ...payload });
          }
        });
      });

      return () => {
        client.punsubscribe(pattern).then(() => client.quit());
      };
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.pdfPool.destroy(), this.xlsxPool.destroy()]);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async runGeneration(reportId: string, type: string, format: string): Promise<void> {
    try {
      await this.updateStatus(reportId, 'processing');

      const delayMs = this.config.getReports().generationDelayMs;
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }

      const [template, data] = [
        this.templates.getTemplate(type, format),
        this.data.getData(type, format),
      ];

      const pool = format === 'pdf' ? this.pdfPool : this.xlsxPool;
      const buffer = (await pool.run({
        reportId,
        template: template ?? { reportType: type, format, modules: [] },
        data: (data as Record<string, unknown>) ?? {},
      })) as Buffer;

      const s3Key = `reports/${reportId}.${format}`;
      await this.s3.upload(s3Key, buffer, CONTENT_TYPE[format]);

      await this.reportRepo.update(reportId, {
        status: 'completed',
        completedAt: new Date(),
        s3Key,
      });
      await this.setStatus(reportId, { status: 'completed', s3Key });

      this.logger.log(`Report generated: ${reportId} (${type}/${format})`);
    } catch (err) {
      this.logger.error(`Report generation failed: ${reportId}`, err);
      await this.reportRepo.update(reportId, { status: 'failed', completedAt: new Date() });
      await this.setStatus(reportId, { status: 'failed' });
    }
  }

  private async setStatus(reportId: string, payload: StatusPayload): Promise<void> {
    const json = JSON.stringify(payload);
    await this.redis.set(statusKey(reportId), json);
    await this.redis.publish(statusChannel(reportId), json);
  }

  private async updateStatus(reportId: string, status: ReportStatus): Promise<void> {
    await this.reportRepo.update(reportId, { status });
    await this.setStatus(reportId, { status });
  }
}
