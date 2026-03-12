import { Module } from '@nestjs/common';
import { RedisModule } from './redis/redis.module';
import { DatabaseModule } from './database/database.module';
import { S3Module } from './s3/s3.module';

@Module({
  imports: [RedisModule, DatabaseModule, S3Module],
})
export class InfraModule {}
