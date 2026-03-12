import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsSseController } from './reports-sse.controller';
import { ReportsService } from './reports.service';
import { Report } from './entities/report.entity';
import { ReportWorkerManagerModule } from '../report-worker-manager/report-worker-manager.module';
import { ReportTemplatesModule } from '../report-templates/report-templates.module';

@Module({
    imports: [TypeOrmModule.forFeature([Report]), ReportWorkerManagerModule, ReportTemplatesModule],
    controllers: [ReportsController, ReportsSseController],
    providers: [ReportsService],
})
export class ReportsModule {}
