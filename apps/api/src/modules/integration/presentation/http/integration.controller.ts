import { Body, Controller, Get, HttpCode, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { CurrentUser } from '../../../iam/presentation/http/current-user.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import type { AccessClaims } from '../../../iam/domain/ports/token-service.port';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';
import { PlanGuard } from '../../../billing/presentation/http/plan.guard';
import { EntitlementsService } from '../../../billing/application/entitlements.service';

import { GetMercadoLivreAuthUrlUseCase } from '@marketmind/integration-core';
import { ConnectMercadoLivreUseCase } from '@marketmind/integration-core';
import { ListMarketplaceAccountsUseCase } from '@marketmind/integration-core';
import { SyncOrdersUseCase } from '@marketmind/integration-core';
import {
  HandleMercadoLivreWebhookUseCase,
  MlWebhookNotification,
} from '@marketmind/integration-core';
import { OAuthStateService } from '@marketmind/integration-core';
import { SyncOrdersDto } from './dto/sync-orders.dto';

@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('integrations/mercado-livre')
export class IntegrationController {
  constructor(
    private readonly getAuthUrl: GetMercadoLivreAuthUrlUseCase,
    private readonly connect: ConnectMercadoLivreUseCase,
    private readonly listAccounts: ListMarketplaceAccountsUseCase,
    private readonly syncOrders: SyncOrdersUseCase,
    private readonly handleWebhook: HandleMercadoLivreWebhookUseCase,
    private readonly state: OAuthStateService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /** Inicia o OAuth: devolve a URL de consentimento (state assinado com o tenant).
   *  Respeita o limite de contas do plano (402 se exceder) e o paywall. */
  @Get('authorize')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.INTEGRATION_WRITE)
  async authorize(@CurrentUser() user: AccessClaims) {
    await this.entitlements.assertWithinLimit('marketplace_accounts');
    const state = this.state.sign(user.companyId);
    return this.getAuthUrl.execute({ state });
  }

  /** Lista as contas conectadas da empresa (sem tokens) + status efetivo. */
  @Get('accounts')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.INTEGRATION_READ)
  accounts(@CurrentUser() user: AccessClaims) {
    return this.listAccounts.execute({ companyId: user.companyId });
  }

  /** Callback público do Mercado Livre (redirect do navegador com code+state).
   *  Conecta e redireciona de volta para a tela de Integrações do web. */
  @Get('callback')
  @SkipThrottle()
  @AuditAction('integration.ml.connect')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response): Promise<void> {
    const base = this.webBaseUrl();
    try {
      const companyId = this.state.verify(state);
      await this.connect.execute({ companyId, code });
      res.redirect(`${base}/dashboard/settings/integrations?connected=1`);
    } catch {
      res.redirect(`${base}/dashboard/settings/integrations?error=1`);
    }
  }

  /** Dispara a sincronização de pedidos da conta (uso manual / agendado).
   *  Bloqueado pelo paywall quando o acesso está suspenso (trial/inadimplência). */
  @Post('sync/orders')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, PermissionsGuard, PlanGuard)
  @RequirePermissions(PERMISSIONS.INTEGRATION_WRITE)
  @AuditAction('integration.ml.sync_orders')
  sync(@Body() dto: SyncOrdersDto) {
    return this.syncOrders.execute({ accountId: dto.accountId, limit: dto.limit, offset: dto.offset });
  }

  /** Webhook do ML: responde rápido + idempotente (público, sem guard). */
  @Post('webhook')
  @SkipThrottle()
  @HttpCode(200)
  async webhook(@Body() notification: MlWebhookNotification) {
    return this.handleWebhook.execute(notification);
  }

  private webBaseUrl(): string {
    const origin = this.config.get<string>('CORS_ORIGIN')?.split(',')[0] ?? 'http://localhost:3000';
    return origin.replace(/\/$/, '');
  }
}
