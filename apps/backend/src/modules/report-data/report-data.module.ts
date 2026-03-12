import { Module } from '@nestjs/common';
import { ReportDataService } from './report-data.service';

@Module({
  providers: [ReportDataService],
  exports: [ReportDataService],
})
export class ReportDataModule {}
