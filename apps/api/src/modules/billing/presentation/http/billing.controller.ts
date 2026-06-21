import { Body, Controller, Get, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { CurrentUser } from '../../../iam/presentation/http/current-user.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import type { AccessClaims } from '../../../iam/domain/ports/token-service.port';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';
import { EntitlementsService } from '../../application/entitlements.service';
import { CreateCheckoutSessionUseCase } from '../../application/create-checkout-session.use-case';
import { CreatePortalSessionUseCase } from '../../application/create-portal-session.use-case';
import { PLAN_REPOSITORY, PlanRepository } from '../../domain/ports/plan.repository';
import { CheckoutDto } from './dto/checkout.dto';

/**
 * Cobrança da empresa: leitura (estado/planos) e ações de pagamento (checkout/
 * portal). Webhooks entram no Inc.3 num controller próprio (sem guard).
 */
@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly checkout: CreateCheckoutSessionUseCase,
    private readonly portal: CreatePortalSessionUseCase,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    private readonly config: ConfigService,
  ) {}

  /** Plano, status (trial/ativo/bloqueado), limites e uso atual da empresa. */
  @Get()
  @RequirePermissions(PERMISSIONS.BILLING_READ)
  async getBilling() {
    return this.entitlements.getEntitlements();
  }

  /** Catálogo de planos vendáveis (para a tela de planos). */
  @Get('plans')
  @RequirePermissions(PERMISSIONS.BILLING_READ)
  async listPlans() {
    const plans = await this.plans.listActive();
    return plans.map((p) => ({
      code: p.code,
      name: p.name,
      priceCents: p.priceCents,
      currency: p.currency,
      interval: p.interval,
      trialDays: p.trialDays,
      limits: {
        maxMarketplaceAccounts: p.maxMarketplaceAccounts,
        maxProducts: p.maxProducts,
        historyWindowDays: p.historyWindowDays,
      },
    }));
  }

  /** Inicia a assinatura: devolve a URL de checkout hospedada do provedor. */
  @Post('checkout')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.BILLING_MANAGE)
  @AuditAction('billing.checkout')
  async createCheckout(@CurrentUser() user: AccessClaims, @Body() dto: CheckoutDto) {
    const base = `${this.webBaseUrl()}/dashboard/settings/billing`;
    return this.checkout.execute({
      planCode: dto.planCode,
      userEmail: user.email,
      companyId: user.companyId,
      successUrl: `${base}?checkout=success`,
      cancelUrl: `${base}?checkout=cancel`,
    });
  }

  /** Abre o portal do cliente (trocar cartão, faturas, cancelar). */
  @Post('portal')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.BILLING_MANAGE)
  @AuditAction('billing.portal')
  async createPortal() {
    return this.portal.execute({ returnUrl: `${this.webBaseUrl()}/dashboard/settings/billing` });
  }

  private webBaseUrl(): string {
    const origin = this.config.get<string>('CORS_ORIGIN')?.split(',')[0] ?? 'http://localhost:3000';
    return origin.replace(/\/$/, '');
  }
}
