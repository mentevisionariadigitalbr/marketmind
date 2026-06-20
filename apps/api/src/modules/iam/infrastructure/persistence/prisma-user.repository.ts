import { Injectable } from '@nestjs/common';
import { PrismaService } from '@marketmind/kernel';
import { User, UserRole, UserStatus } from '../../domain/entities/user.entity';
import { CreateUserData, UserRepository, UserSummary } from '../../domain/ports/user.repository';

interface UserRow {
  id: string;
  companyId: string;
  name: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.db.user.findUnique({ where: { email } });
    return row ? this.toEntity(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.db.user.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const row = await this.prisma.db.user.findUnique({ where: { googleId } });
    return row ? this.toEntity(row) : null;
  }

  async attachGoogleId(userId: string, googleId: string): Promise<User> {
    const row = await this.prisma.db.user.update({ where: { id: userId }, data: { googleId } });
    return this.toEntity(row);
  }

  async updateProfile(userId: string, data: { name: string }): Promise<User> {
    const row = await this.prisma.db.user.update({ where: { id: userId }, data: { name: data.name } });
    return this.toEntity(row);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.db.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async listByCompany(companyId: string): Promise<UserSummary[]> {
    const rows = await this.prisma.db.user.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role as UserRole,
      status: r.status as UserStatus,
    }));
  }

  async updateRole(userId: string, role: UserRole): Promise<User> {
    const row = await this.prisma.db.user.update({ where: { id: userId }, data: { role } });
    return this.toEntity(row);
  }

  async setInvite(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.db.user.update({
      where: { id: userId },
      data: { inviteTokenHash: tokenHash, inviteExpiresAt: expiresAt },
    });
  }

  async findInviteByTokenHash(tokenHash: string): Promise<{ userId: string; expiresAt: Date } | null> {
    const row = await this.prisma.db.user.findUnique({
      where: { inviteTokenHash: tokenHash },
      select: { id: true, inviteExpiresAt: true },
    });
    if (!row || !row.inviteExpiresAt) return null;
    return { userId: row.id, expiresAt: row.inviteExpiresAt };
  }

  async activateFromInvite(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.db.user.update({
      where: { id: userId },
      data: { passwordHash, status: 'ACTIVE', inviteTokenHash: null, inviteExpiresAt: null },
    });
  }

  async create(data: CreateUserData): Promise<User> {
    const row = await this.prisma.db.user.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash ?? undefined,
        googleId: data.googleId ?? undefined,
        role: data.role ?? undefined,
        status: data.status ?? undefined,
      },
    });
    return this.toEntity(row);
  }

  private toEntity(row: UserRow): User {
    return new User({
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      email: row.email,
      passwordHash: row.passwordHash,
      googleId: row.googleId,
      role: row.role as UserRole,
      status: row.status as UserStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
