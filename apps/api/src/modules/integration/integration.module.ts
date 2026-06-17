import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { IamModule } from '../iam/iam.module';

import { IntegrationController } from './presentation/http/integration.controller';

import { GetMercadoLivreAuthUrlUseCase } from './application/use-cases/get-ml-auth-url.use-case';
import { ConnectMercadoLivreUseCase } from './application/use-cases/connect-mercado-livre.use-case';
import { SyncOrdersUseCase } from './application/use-cases/sync-orders.use-case';
import { SyncProductsUseCase } from './application/use-cases/sync-products.use-case';
import { SyncVariationsUseCase } from './application/use-cases/sync-variations.use-case';
import { SyncInventoryUseCase } from './application/use-cases/sync-inventory.use-case';
import { SyncPricesUseCase } from './application/use-cases/sync-prices.use-case';
import { SyncCategoriesUseCase } from './application/use-cases/sync-categories.use-case';
import { HandleMercadoLivreWebhookUseCase } from './application/use-cases/handle-ml-webhook.use-case';
import { MercadoLivreSession } from './application/services/mercado-livre-session.service';

import { MARKETPLACE_ACCOUNT_REPOSITORY } from './domain/ports/marketplace-account.repository';
import { ORDER_SYNC_REPOSITORY } from './domain/ports/order-sync.repository';
import { CATALOG_SYNC_REPOSITORY } from './domain/ports/catalog-sync.repository';
import { WEBHOOK_EVENT_REPOSITORY } from './domain/ports/webhook-event.repository';
import {
  MERCADO_LIVRE_API_FACTORY,
  MERCADO_LIVRE_OAUTH,
} from './domain/ports/mercado-livre.port';

import { PrismaMarketplaceAccountRepository } from './infrastructure/persistence/prisma-marketplace-account.repository';
import { PrismaOrderSyncRepository } from './infrastructure/persistence/prisma-order-sync.repository';
import { PrismaCatalogSyncRepository } from './infrastructure/persistence/prisma-catalog-sync.repository';
import { PrismaWebhookEventRepository } from './infrastructure/persistence/prisma-webhook-event.repository';
import { MercadoLivreOAuthAdapter } from './infrastructure/mercado-livre/ml-oauth.adapter';
import { MercadoLivreApiFactoryAdapter } from './infrastructure/mercado-livre/ml-api.factory';
import { OAuthStateService } from './infrastructure/mercado-livre/oauth-state.service';

@Module({
  imports: [IamModule, JwtModule.register({})],
  controllers: [IntegrationController],
  providers: [
    GetMercadoLivreAuthUrlUseCase,
    ConnectMercadoLivreUseCase,
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
