import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { Redis } from 'ioredis';

import { validateEnv } from './config/env';
import { RedisThrottlerStorage } from './shared/throttler/redis-throttler.storage';
import { ObservableThrottlerGuard } from './shared/throttler/observable-throttler.guard';
import { PrismaModule } from './shared/prisma/prisma.module';
import { CryptoModule } from './shared/crypto/crypto.module';
import { QueueModule } from './shared/queue/queue.module';
import { MailModule } from './shared/mail/mail.module';
import { AuditModule } from './shared/audit/audit.module';
import { DomainExceptionFilter } from './shared/http/domain-exception.filter';
import { TenantInterceptor } from './shared/tenant/tenant.interceptor';
import { ImpersonationReadOnlyInterceptor } from './shared/impersonation/impersonation-read-only.interceptor';
import { IamModule } from './modules/iam/iam.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FinanceModule } from './modules/finance/finance.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { ProductsModule } from './modules/products/products.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CashflowModule } from './modules/cashflow/cashflow.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { BillingModule } from './modules/billing/billing.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env'],
    }),
    // Rate limiting global por IP. Limites por rota via @Throttle.
    // Storage em Redis quando há REDIS_URL (limite compartilhado entre instâncias,
    // Sprint 4.0); sem Redis, cai no storage em memória (dev/test).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        let storage: RedisThrottlerStorage | undefined;
        if (redisUrl) {
          const redis = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
          redis.on('error', () => undefined); // resiliente: erros não derrubam a app
          void redis.connect().catch(() => undefined);
          storage = new RedisThrottlerStorage(redis);
        }
        return {
          throttlers: [
            {
              name: 'default',
              ttl: config.get<number>('THROTTLE_TTL_MS') ?? 60_000,
              limit: config.get<number>('THROTTLE_LIMIT') ?? 300,
            },
          ],
          storage,
        };
      },
    }),
    PrismaModule,
    CryptoModule,
    QueueModule,
    MailModule,
    AuditModule,
    IamModule,
    IntegrationModule,
    DashboardModule,
    FinanceModule,
    InventoryModule,
    SuppliersModule,
    PurchasesModule,
    ProductsModule,
    AnalyticsModule,
    CashflowModule,
    PricingModule,
    ReportsModule,
    ChannelsModule,
    BillingModule,
    PrivacyModule,
    AdminModule,
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
    // Bloqueia escrita em sessões de impersonação (somente leitura) — antes do tenant.
    { provide: APP_INTERCEPTOR, useClass: ImpersonationReadOnlyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_GUARD, useClass: ObservableThrottlerGuard },
  ],
})
export class AppModule {}
