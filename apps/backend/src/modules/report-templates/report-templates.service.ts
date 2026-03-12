import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { ReportTemplate } from '../report-worker-manager/workers/worker.types';

export type { ReportTemplate };

@Injectable()
export class ReportTemplatesService {
  private readonly templatesDir = path.join(process.cwd(), 'data', 'report_templates');

  getTemplate(reportType: string, format: string): ReportTemplate | null {
    const filepath = path.join(this.templatesDir, `${reportType}.json`);
    if (!fs.existsSync(filepath)) return null;

    const template = JSON.parse(fs.readFileSync(filepath, 'utf8')) as ReportTemplate;
    if (template.format !== format) return null;

    return template;
  }

  listTemplates(): Array<{ reportType: string; format: string }> {
    const files = fs.readdirSync(this.templatesDir);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const t = JSON.parse(
          fs.readFileSync(path.join(this.templatesDir, f), 'utf8'),
        ) as ReportTemplate;
        return { reportType: t.reportType, format: t.format };
      });
  }
}
