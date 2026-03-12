import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../../config/config.module';
import { ConfigService } from '../../config/config.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const { host, port, username, password, database } = config.getServices().database;
                return {
                    type: 'postgres',
                    host,
                    port,
                    username,
                    password,
                    database,
                    autoLoadEntities: true,
                    synchronize: false,
                };
            },
        }),
    ],
})
export class DatabaseModule {}
