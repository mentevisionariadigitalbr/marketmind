import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  RecordWebhookData,
  WebhookEventRepository,
} from '../../domain/ports/webhook-event.repository';

@Injectable()
export class PrismaWebhookEventRepository implements WebhookEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordIfNew(data: RecordWebhookData): Promise<boolean> {
    try {
      await this.prisma.db.webhookEvent.create({
        data: {
          companyId: data.companyId ?? undefined,
          source: data.source,
          topic: data.topic,
          resource: data.resource,
          dedupeKey: data.dedupeKey,
          payload: data.payload as Prisma.InputJsonValue,
        },
      });
      return true;
    } catch (err) {
      // Violação de unique no dedupeKey => notificação duplicada (idempotência).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return false;
      }
      throw err;
    }
  }

  async markProcessed(dedupeKey: string): Promise<void> {
    await this.prisma.db.webhookEvent.updateMany({
      where: { dedupeKey },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  }
}
