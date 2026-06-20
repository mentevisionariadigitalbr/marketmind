import { Injectable } from '@nestjs/common';
import { PrismaService } from '@marketmind/kernel';
import {
  CreateRefreshTokenData,
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshTokenData): Promise<RefreshTokenRecord> {
    const row = await this.prisma.db.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent ?? undefined,
        ip: data.ip ?? undefined,
      },
    });
    return this.toRecord(row);
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const row = await this.prisma.db.refreshToken.findUnique({ where: { tokenHash } });
    return row ? this.toRecord(row) : null;
  }

  async revoke(id: string, replacedByTokenId?: string | null): Promise<void> {
    await this.prisma.db.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedByTokenId: replacedByTokenId ?? undefined },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private toRecord(row: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedByTokenId: string | null;
  }): RefreshTokenRecord {
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      replacedByTokenId: row.replacedByTokenId,
    };
  }
}
