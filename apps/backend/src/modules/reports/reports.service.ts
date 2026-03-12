import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { ReportWorkerManagerService, StatusPayload } from '../report-worker-manager/report-worker-manager.service';
import { ReportTemplatesService } from '../report-templates/report-templates.service';
import { S3Service } from '../../infra/s3/s3.service';
import { Report } from './entities/report.entity';

@Injectable()
export class ReportsService {
  constructor(
    private readonly workerManager: ReportWorkerManagerService,
    private readonly templates: ReportTemplatesService,
    private readonly s3: S3Service,
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
  ) {}

  getAvailableTypes(): Array<{ reportType: string; format: string }> {
    return this.templates.listTemplates();
  }

  async startGeneration(type: string, format: string): Promise<string> {
    return this.workerManager.startGeneration(type, format);
  }

  async getStatus(reportId: string): Promise<StatusPayload | null> {
    return this.workerManager.getStatus(reportId);
  }

  statusStream(reportId: string): Observable<StatusPayload> {
    return this.workerManager.statusStream(reportId);
  }

  async getDownloadUrl(reportId: string): Promise<{ url: string } | null> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report?.s3Key) return null;
    const url = await this.s3.getSignedDownloadUrl(report.s3Key);
    return { url };
  }

  listCompleted(): Promise<Report[]> {
    return this.reportRepo.find({
      where: { status: 'completed' },
      order: { completedAt: 'DESC' },
      take: 50,
    });
  }

  listAll(): Promise<Report[]> {
    return this.reportRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  listProcessing(): Promise<Report[]> {
    return this.reportRepo.find({
      where: { status: In(['pending', 'processing']) },
      order: { createdAt: 'DESC' },
    });
  }

  statusStreamAll(): Observable<{ reportId: string } & StatusPayload> {
    return this.workerManager.statusStreamAll();
  }
}
