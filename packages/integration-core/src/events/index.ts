import type { DomainEvent } from '@marketmind/kernel';

/**
 * Contratos de eventos de domínio padronizados (event-driven). Todos tipados e
 * carregam `companyId` (tenant) + `correlationId` para rastreio ponta a ponta.
 */
interface IntegrationEvent extends DomainEvent {
  companyId: string;
  marketplaceAccountId: string;
  correlationId?: string;
}

export interface OrderCreatedEvent extends IntegrationEvent {
  name: 'order.created';
  orderExternalId: string;
}

export interface OrderUpdatedEvent extends IntegrationEvent {
  name: 'order.updated';
  orderExternalId: string;
  status: string;
}

export interface CatalogUpdatedEvent extends IntegrationEvent {
  name: 'catalog.updated';
  productExternalId: string;
  variantCount: number;
}

export interface InventoryUpdatedEvent extends IntegrationEvent {
  name: 'inventory.updated';
  productExternalId: string;
  available: number;
}

export interface PriceChangedEvent extends IntegrationEvent {
  name: 'price.changed';
  productExternalId: string;
  oldPrice: number | null;
  newPrice: number;
}

export interface WebhookReceivedEvent extends DomainEvent {
  name: 'webhook.received';
  source: string;
  topic: string;
  resource: string;
  dedupeKey: string;
  correlationId?: string;
}

export interface JobFailedEvent extends DomainEvent {
  name: 'job.failed';
  queue: string;
  jobId: string;
  attempts: number;
  error: string;
  deadLettered: boolean;
}

export type IntegrationDomainEvent =
  | OrderCreatedEvent
  | OrderUpdatedEvent
  | CatalogUpdatedEvent
  | InventoryUpdatedEvent
  | PriceChangedEvent
  | WebhookReceivedEvent
  | JobFailedEvent;
