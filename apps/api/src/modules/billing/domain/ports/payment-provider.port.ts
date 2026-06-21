import { BillingEvent } from '../billing-event';

export const PAYMENT_PROVIDER = Symbol('PaymentProvider');

export interface CreateCustomerParams {
  email: string;
  companyId: string;
}

export interface CheckoutSessionParams {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  /** Metadados propagados ao customer/subscription (reconciliação no webhook). */
  metadata: Record<string, string>;
}

export interface PortalSessionParams {
  customerId: string;
  returnUrl: string;
}

/**
 * Abstração do provedor de pagamento (Stripe no Inc.2; Pix/boleto via 2º adapter
 * depois). Mantém o domínio livre do SDK do provedor.
 */
export interface PaymentProvider {
  /** Identificador do provedor (gravado na assinatura/fatura). */
  readonly name: string;
  /** Cria um customer no provedor e devolve seu id. */
  createCustomer(params: CreateCustomerParams): Promise<{ customerId: string }>;
  /** Cria uma sessão de checkout (assinatura) e devolve a URL hospedada. */
  createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string }>;
  /** Cria uma sessão do portal do cliente (trocar cartão, faturas, cancelar). */
  createPortalSession(params: PortalSessionParams): Promise<{ url: string }>;
  /**
   * Valida a assinatura do webhook e devolve o evento NORMALIZADO. Lança se a
   * assinatura for inválida (corpo cru obrigatório).
   */
  parseWebhookEvent(rawBody: Buffer | string, signature: string): BillingEvent;
}
