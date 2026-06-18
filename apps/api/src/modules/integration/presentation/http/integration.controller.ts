import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { CurrentUser } from '../../../iam/presentation/http/current-user.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import type { AccessClaims } from '../../../iam/domain/ports/token-service.port';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import { GetMercadoLivreAuthUrlUseCase } from '@marketmind/integration-core';
import { ConnectMercadoLivreUseCase } from '@marketmind/integration-core';
import { SyncOrdersUseCase } from '@marketmind/integration-core';
import {
  HandleMercadoLivreWebhookUseCase,
  MlWebhookNotification,
} from '@marketmind/integration-core';
import { OAuthStateService } from '@marketmind/integration-core';
import { SyncOrdersDto } from './dto/sync-orders.dto';

@Controller('integrations/mercado-livre')
export class IntegrationController {
  constructor(
    private readonly getAuthUrl: GetMercadoLivreAuthUrlUseCase,
    private readonly connect: ConnectMercadoLivreUseCase,
    private readonly syncOrders: SyncOrdersUseCase,
    private readonly handleWebhook: HandleMercadoLivreWebhookUseCase,
    private readonly state: OAuthStateService,
  ) {}

  /** Inicia o OAuth: devolve a URL de consentimento (state assinado com o tenant). */
  @Get('authorize')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.INTEGRATION_WRITE)
  authorize(@CurrentUser() user: AccessClaims) {
    const state = this.state.sign(user.companyId);
    return this.getAuthUrl.execute({ state });
  }

  /** Callback público do Mercado Livre (redirect do navegador com code+state). */
  @Get('callback')
  @AuditAction('integration.ml.connect')
  async callback(@Query('code') code: string, @Query('state') state: string) {
    const companyId = this.state.verify(state);
    const account = await this.connect.execute({ companyId, code });
    return { connected: true, account };
  }

  /** Dispara a sincronização de pedidos da conta (uso manual / agendado). */
  @Post('sync/orders')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.INTEGRATION_WRITE)
  @AuditAction('integration.ml.sync_orders')
  sync(@Body() dto: SyncOrdersDto) {
    return this.syncOrders.execute({ accountId: dto.accountId, limit: dto.limit });
  }

  /** Webhook do ML: responde rápido + idempotente (público, sem guard). */
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() notification: MlWebhookNotification) {
    return this.handleWebhook.execute(notification);
  }
}
