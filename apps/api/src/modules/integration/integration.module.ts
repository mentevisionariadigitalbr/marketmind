import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { IamModule } from '../iam/iam.module';
import { BillingModule } from '../billing/billing.module';

import { IntegrationController } from './presentation/http/integration.controller';

import { GetMercadoLivreAuthUrlUseCase } from '@marketmind/integration-core';
import { ConnectMercadoLivreUseCase } from '@marketmind/integration-core';
import { ListMarketplaceAccountsUseCase } from '@marketmind/integration-core';
import { SyncOrdersUseCase } from '@marketmind/integration-core';
import { SyncProductsUseCase } from '@marketmind/integration-core';
import { SyncVariationsUseCase } from '@marketmind/integration-core';
import { SyncInventoryUseCase } from '@marketmind/integration-core';
import { SyncPricesUseCase } from '@marketmind/integration-core';
import { SyncCategoriesUseCase } from '@marketmind/integration-core';
import { HandleMercadoLivreWebhookUseCase } from '@marketmind/integration-core';
import { MercadoLivreSession } from '@marketmind/integration-core';

import { MARKETPLACE_ACCOUNT_REPOSITORY } from '@marketmind/integration-core';
import { ORDER_SYNC_REPOSITORY } from '@marketmind/integration-core';
import { CATALOG_SYNC_REPOSITORY } from '@marketmind/integration-core';
import { WEBHOOK_EVENT_REPOSITORY } from '@marketmind/integration-core';
import {
  MERCADO_LIVRE_API_FACTORY,
  MERCADO_LIVRE_OAUTH,
} from '@marketmind/integration-core';

import { PrismaMarketplaceAccountRepository } from '@marketmind/integration-core';
import { PrismaOrderSyncRepository } from '@marketmind/integration-core';
import { PrismaCatalogSyncRepository } from '@marketmind/integration-core';
import { PrismaWebhookEventRepository } from '@marketmind/integration-core';
import { MercadoLivreOAuthAdapter } from '@marketmind/integration-core';
import { MercadoLivreApiFactoryAdapter } from '@marketmind/integration-core';
import { OAuthStateService } from '@marketmind/integration-core';

@Module({
  imports: [IamModule, BillingModule, JwtModule.register({})],
  controllers: [IntegrationController],
  providers: [
    GetMercadoLivreAuthUrlUseCase,
    ConnectMercadoLivreUseCase,
    ListMarketplaceAccountsUseCase,
    SyncOrdersUseCase,
    SyncProductsUseCase,
    SyncVariationsUseCase,
    SyncInventoryUseCase,
    SyncPricesUseCase,
    SyncCategoriesUseCase,
    HandleMercadoLivreWebhookUseCase,
    MercadoLivreSession,
    OAuthStateService,

    // Ports -> Adapters
    { provide: MARKETPLACE_ACCOUNT_REPOSITORY, useClass: PrismaMarketplaceAccountRepository },
    { provide: ORDER_SYNC_REPOSITORY, useClass: PrismaOrderSyncRepository },
    { provide: CATALOG_SYNC_REPOSITORY, useClass: PrismaCatalogSyncRepository },
    { provide: WEBHOOK_EVENT_REPOSITORY, useClass: PrismaWebhookEventRepository },
    { provide: MERCADO_LIVRE_API_FACTORY, useClass: MercadoLivreApiFactoryAdapter },
    {
      provide: MERCADO_LIVRE_OAUTH,
      useFactory: (config: ConfigService) =>
        new MercadoLivreOAuthAdapter({
          clientId: config.get<string>('ML_CLIENT_ID'),
          clientSecret: config.get<string>('ML_CLIENT_SECRET'),
          redirectUri: config.get<string>('ML_REDIRECT_URI'),
        }),
      inject: [ConfigService],
    },
  ],
})
export class IntegrationModule {}
