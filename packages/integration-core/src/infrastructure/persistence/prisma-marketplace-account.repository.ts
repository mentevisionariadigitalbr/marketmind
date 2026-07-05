import { Injectable } from '@nestjs/common';
import { MarketplaceCode } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import {
  MarketplaceAccount,
  MarketplaceAccountRepository,
  MarketplaceAccountStatus,
  MarketplaceAccountSummary,
  UpdateTokensData,
  UpsertAccountData,
} from '../../domain/ports/marketplace-account.repository';

interface AccountRow {
  id: string;
  companyId: string;
  marketplaceId: string;
  externalUserId: string;
  nickname: string | null;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt: Date;
  status: string;
}

@Injectable()
export class PrismaMarketplaceAccountRepository implements MarketplaceAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMarketplaceIdByCode(code: string): Promise<string | null> {
    const row = await this.prisma.db.marketplace.findUnique({
      where: { code: code as MarketplaceCode },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async findById(id: string): Promise<MarketplaceAccount | null> {
    const row = await this.prisma.db.marketplaceAccount.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async listByCompany(companyId: string): Promise<MarketplaceAccountSummary[]> {
    const rows = await this.prisma.db.marketplaceAccount.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
      include: { marketplace: { select: { code: true, name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      marketplaceCode: r.marketplace.code,
      marketplaceName: r.marketplace.name,
      externalUserId: r.externalUserId,
      nickname: r.nickname,
      status: r.status as MarketplaceAccountStatus,
      tokenExpiresAt: r.tokenExpiresAt,
      lastSyncedAt: r.lastSyncedAt,
    }));
  }

  async findByExternalUserId(externalUserId: string): Promise<MarketplaceAccount[]> {
    const rows = await this.prisma.db.marketplaceAccount.findMany({ where: { externalUserId } });
    return rows.map((r) => this.toEntity(r));
  }

  async listConnected(): Promise<MarketplaceAccount[]> {
    const rows = await this.prisma.db.marketplaceAccount.findMany({ where: { status: 'CONNECTED' } });
    return rows.map((r) => this.toEntity(r));
  }

  async upsert(data: UpsertAccountData): Promise<MarketplaceAccount> {
    const row = await this.prisma.db.marketplaceAccount.upsert({
      where: {
        companyId_marketplaceId_externalUserId: {
          companyId: data.companyId,
          marketplaceId: data.marketplaceId,
          externalUserId: data.externalUserId,
        },
      },
      create: {
        companyId: data.companyId,
        marketplaceId: data.marketplaceId,
        externalUserId: data.externalUserId,
        nickname: data.nickname ?? undefined,
        accessTokenEnc: data.accessTokenEnc,
        refreshTokenEnc: data.refreshTokenEnc,
        tokenExpiresAt: data.tokenExpiresAt,
        status: 'CONNECTED',
      },
      update: {
        nickname: data.nickname ?? undefined,
        accessTokenEnc: data.accessTokenEnc,
        refreshTokenEnc: data.refreshTokenEnc,
        tokenExpiresAt: data.tokenExpiresAt,
        status: 'CONNECTED',
      },
    });
    return this.toEntity(row);
  }

  async updateTokens(id: string, data: UpdateTokensData): Promise<MarketplaceAccount> {
    const row = await this.prisma.db.marketplaceAccount.update({
      where: { id },
      data: {
        accessTokenEnc: data.accessTokenEnc,
        refreshTokenEnc: data.refreshTokenEnc,
        tokenExpiresAt: data.tokenExpiresAt,
        status: data.status ?? 'CONNECTED',
      },
    });
    return this.toEntity(row);
  }

  async markSynced(id: string, at: Date): Promise<void> {
    await this.prisma.db.marketplaceAccount.update({
      where: { id },
      data: { lastSyncedAt: at },
    });
  }

  private toEntity(row: AccountRow): MarketplaceAccount {
    return {
      id: row.id,
      companyId: row.companyId,
      marketplaceId: row.marketplaceId,
      externalUserId: row.externalUserId,
      nickname: row.nickname,
      accessTokenEnc: row.accessTokenEnc,
      refreshTokenEnc: row.refreshTokenEnc,
      tokenExpiresAt: row.tokenExpiresAt,
      status: row.status as MarketplaceAccountStatus,
    };
  }
}
