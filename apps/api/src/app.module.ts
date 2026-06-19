import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { validateEnv } from './config/env';
import { PrismaModule } from './shared/prisma/prisma.module';
import { CryptoModule } from './shared/crypto/crypto.module';
import { QueueModule } from './shared/queue/queue.module';
import { AuditModule } from './shared/audit/audit.module';
import { DomainExceptionFilter } from './shared/http/domain-exception.filter';
import { TenantInterceptor } from './shared/tenant/tenant.interceptor';
import { IamModule } from './modules/iam/iam.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    CryptoModule,
    QueueModule,
    AuditModule,
    IamModule,
    IntegrationModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
