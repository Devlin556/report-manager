import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { ReportTemplate } from '../report-worker-manager/workers/worker.types';

export type { ReportTemplate };

@Injectable()
export class ReportTemplatesService implements OnModuleInit {
    private templates: Map<string, ReportTemplate> = new Map<string, ReportTemplate>();
    private readonly templatesDir = path.join(process.cwd(), 'data', 'report_templates');

    onModuleInit(): any {
        const files = fs.readdirSync(this.templatesDir);

        files
            .filter((file) => file.endsWith('.json'))
            .forEach((file) => {
                const template = JSON.parse(
                    fs.readFileSync(path.join(this.templatesDir, file), 'utf8'),
                ) as ReportTemplate;

                this.templates.set(`${template.reportType}:${template.format}`, template);
            });
    }

    getTemplate(reportType: string, format: string): ReportTemplate | null {
        return this.templates.get(`${reportType}:${format}`) ?? null;
    }

    listTemplates(): Array<{ reportType: string; format: string }> {
        return Array.from(this.templates.values()).map((template) => ({
            reportType: template.reportType,
            format: template.format,
        }));
    }
}
