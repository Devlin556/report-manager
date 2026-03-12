import { Module } from '@nestjs/common';
import { ReportTemplatesService } from './report-templates.service';

@Module({
    providers: [ReportTemplatesService],
    exports: [ReportTemplatesService],
})
export class ReportTemplatesModule {}
