import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { InfraModule } from './infra/infra.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
    imports: [ConfigModule, InfraModule, ReportsModule],
    controllers: [],
    providers: [],
})
export class AppModule {}
