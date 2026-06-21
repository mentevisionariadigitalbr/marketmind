import { Injectable } from '@nestjs/common';
import { LegalDocumentType as PrismaLegalDocumentType } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import {
  LegalAcceptanceRecord,
  LegalAcceptanceRepository,
  RecordAcceptanceData,
} from '../../domain/ports/legal-acceptance.repository';
import { LegalDocumentType } from '../../domain/legal-documents';

/**
 * Persistência do aceite legal. No cadastro roda SEM tenant (bootstrap — RLS aberta
 * com a GUC vazia); na exportação roda com o tenant corrente. Em ambos, o companyId
 * é explícito.
 */
@Injectable()
export class PrismaLegalAcceptanceRepository implements LegalAcceptanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(data: RecordAcceptanceData): Promise<void> {
    await this.prisma.db.legalAcceptance.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        documentType: data.documentType as PrismaLegalDocumentType,
        version: data.version,
        ip: data.ip ?? undefined,
        userAgent: data.userAgent ?? undefined,
      },
    });
  }

  async listForUser(userId: string): Promise<LegalAcceptanceRecord[]> {
    const rows = await this.prisma.db.legalAcceptance.findMany({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
      select: { documentType: true, version: true, acceptedAt: true },
    });
    return rows.map((r) => ({
      documentType: r.documentType as LegalDocumentType,
      version: r.version,
      acceptedAt: r.acceptedAt,
    }));
  }
}
