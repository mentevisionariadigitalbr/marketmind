import { Injectable } from '@nestjs/common';
import { Prisma, SubscriptionStatus as PrismaSubStatus, InvoiceStatus as PrismaInvoiceStatus } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import {
  ActivateSubscriptionData,
  BillingSyncRepository,
  UpdateSubscriptionData,
  UpsertInvoiceData,
} from '../../domain/ports/billing-sync.repository';

/**
 * Persistência dirigida por webhook. Roda SEM tenant (GUC vazia → RLS aberta);
 * o isolamento vem dos filtros explícitos por id do provedor/company.
 */
@Injectable()
export class PrismaBillingSyncRepository implements BillingSyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordEventIfNew(eventId: string, eventType: string, payload: unknown): Promise<boolean> {
    try {
      await this.prisma.db.webhookEvent.create({
        data: {
          source: 'stripe',
          topic: eventType,
          resource: eventId,
          dedupeKey: `stripe:${eventId}`,
          payload: payload as Prisma.InputJsonValue,
        },
      });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return false; // já processado (idempotência)
      }
      throw err;
    }
  }

  async markEventProcessed(eventId: string): Promise<void> {
    await this.prisma.db.webhookEvent.updateMany({
      where: { dedupeKey: `stripe:${eventId}` },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  }

  async activateSubscription(data: ActivateSubscriptionData): Promise<void> {
    await this.prisma.db.subscription.updateMany({
      where: { companyId: data.companyId },
      data: {
        planId: data.planId,
        status: 'ACTIVE',
        provider: data.provider,
        providerCustomerId: data.providerCustomerId,
        providerSubscriptionId: data.providerSubscriptionId,
      },
    });
  }

  async updateSubscriptionByProviderId(data: UpdateSubscriptionData): Promise<void> {
    await this.prisma.db.subscription.updateMany({
      where: { providerSubscriptionId: data.providerSubscriptionId },
      data: {
        status: data.status as PrismaSubStatus,
        currentPeriodEnd: data.currentPeriodEnd ?? undefined,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      },
    });
  }

  async cancelByProviderId(providerSubscriptionId: string): Promise<void> {
    await this.prisma.db.subscription.updateMany({
      where: { providerSubscriptionId },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
  }

  async markPastDueByCustomer(providerCustomerId: string): Promise<void> {
    await this.prisma.db.subscription.updateMany({
      where: { providerCustomerId },
      data: { status: 'PAST_DUE' },
    });
  }

  async findCompanyIdByCustomer(providerCustomerId: string): Promise<string | null> {
    const row = await this.prisma.db.subscription.findFirst({
      where: { providerCustomerId },
      select: { companyId: true },
    });
    return row?.companyId ?? null;
  }

  async upsertInvoice(data: UpsertInvoiceData): Promise<void> {
    const sub = await this.prisma.db.subscription.findFirst({
      where: { companyId: data.companyId },
      select: { id: true },
    });
    await this.prisma.db.invoice.upsert({
      where: { providerInvoiceId: data.providerInvoiceId },
      create: {
        companyId: data.companyId,
        subscriptionId: sub?.id ?? null,
        provider: data.provider,
        providerInvoiceId: data.providerInvoiceId,
        amountCents: data.amountCents,
        currency: data.currency,
        status: data.status as PrismaInvoiceStatus,
        paymentMethod: data.paymentMethod,
        hostedUrl: data.hostedUrl,
        paidAt: data.paidAt ?? undefined,
      },
      update: {
        amountCents: data.amountCents,
        status: data.status as PrismaInvoiceStatus,
        paymentMethod: data.paymentMethod ?? undefined,
        hostedUrl: data.hostedUrl ?? undefined,
        paidAt: data.paidAt ?? undefined,
      },
    });
  }
}
