import { Injectable } from '@nestjs/common';
import { UserTokenType as PrismaUserTokenType } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import {
  IssueTokenData,
  UserTokenRepository,
  UserTokenType,
} from '../../domain/ports/user-token.repository';

@Injectable()
export class PrismaUserTokenRepository implements UserTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async issue(data: IssueTokenData): Promise<void> {
    await this.prisma.db.userToken.deleteMany({ where: { userId: data.userId, type: data.type as PrismaUserTokenType } });
    await this.prisma.db.userToken.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        type: data.type as PrismaUserTokenType,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async consume(tokenHash: string, type: UserTokenType): Promise<{ userId: string } | null> {
    const now = new Date();
    // UPDATE atômico: só consome se válido e não usado (evita corrida/reuso).
    const result = await this.prisma.db.userToken.updateMany({
      where: { tokenHash, type: type as PrismaUserTokenType, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (result.count === 0) return null;
    const row = await this.prisma.db.userToken.findUnique({ where: { tokenHash }, select: { userId: true } });
    return row ? { userId: row.userId } : null;
  }
}
