import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN')?.split(',') ?? true,
    credentials: true,
  });
  app.enableShutdownHooks();

  const port = config.get<number>('API_PORT') ?? 3333;
  await app.listen(port);
  Logger.log(`MarketMind API ouvindo em http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
