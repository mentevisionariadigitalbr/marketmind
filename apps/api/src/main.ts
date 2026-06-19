import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN')?.split(',') ?? true,
    credentials: true,
  });
  app.enableShutdownHooks();

  // Swagger (Sprint 3.1, Módulo 9) — documenta o Dashboard e a IAM.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MarketMind AI API')
    .setDescription('Dashboard Executivo Enterprise + Integrações')
    .setVersion('3.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('API_PORT') ?? 3333;
  await app.listen(port);
  Logger.log(`MarketMind API ouvindo em http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger em http://localhost:${port}/docs`, 'Bootstrap');
}

void bootstrap();
