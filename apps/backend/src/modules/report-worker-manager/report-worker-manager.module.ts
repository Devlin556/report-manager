import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportWorkerManagerService } from './report-worker-manager.service';
import { Report } from '../reports/entities/report.entity';
import { ReportTemplatesModule } from '../report-templates/report-templates.module';
import { ReportDataModule } from '../report-data/report-data.module';

@Module({
    imports: [TypeOrmModule.forFeature([Report]), ReportTemplatesModule, ReportDataModule],
    providers: [ReportWorkerManagerService],
    exports: [ReportWorkerManagerService],
})
export class ReportWorkerManagerModule {}
