import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  // Cabeçalhos de segurança (Sprint 3.2). CSP permissiva o suficiente para o
  // Swagger UI (script/style inline); HSTS/frameguard/noSniff/Referrer no default.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
          styleSrc: [`'self'`, `'unsafe-inline'`, 'https:'],
          imgSrc: [`'self'`, 'data:', 'https:'],
          connectSrc: [`'self'`],
        },
      },
      hsts: { maxAge: 15552000, includeSubDomains: true }, // 180 dias
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginEmbedderPolicy: false, // não quebrar Swagger UI
    }),
  );

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
