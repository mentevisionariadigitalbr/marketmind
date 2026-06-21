import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { HandleBillingWebhookUseCase } from '../../application/handle-billing-webhook.use-case';

/**
 * Webhook de cobrança (público, SEM guard). Valida a assinatura sobre o corpo CRU
 * (req.rawBody) e processa de forma idempotente. Responde rápido (ADR-0003).
 */
@Controller('billing/webhook')
export class BillingWebhookController {
  constructor(private readonly handle: HandleBillingWebhookUseCase) {}

  @Post('stripe')
  @SkipThrottle()
  @HttpCode(200)
  async stripe(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    const raw = req.rawBody;
    if (!raw || !signature) {
      throw new BadRequestException('Assinatura ou corpo do webhook ausente.');
    }
    try {
      return await this.handle.execute(raw, signature);
    } catch {
      // Assinatura inválida / corpo malformado: 400 para o provedor reenviar.
      throw new BadRequestException('Webhook inválido.');
    }
  }
}
