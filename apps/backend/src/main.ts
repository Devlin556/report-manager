import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

// ioredis flushQueue при hot reload вызывает unhandled rejection — подавляем только его
process.on('unhandledRejection', (reason) => {
  if (reason instanceof Error && reason.message === 'Connection is closed') return;
  if (String(reason).includes('Connection is closed')) return;
  console.error('Unhandled Rejection:', reason);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const config = app.get(ConfigService);
  const port = config.getPorts().application;
  await app.listen(port);
}

bootstrap();
