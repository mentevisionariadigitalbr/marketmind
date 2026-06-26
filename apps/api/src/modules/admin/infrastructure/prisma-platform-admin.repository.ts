import { Injectable } from '@nestjs/common';
import { PrismaService } from '@marketmind/kernel';
import {
  PlatformAdminRecord,
  PlatformAdminRepository,
} from '../domain/ports/platform-admin.repository';

/** Persistência do super-admin de plataforma (tabela global, sem RLS). */
@Injectable()
export class PrismaPlatformAdminRepository implements PlatformAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<PlatformAdminRecord | null> {
    const row = await this.prisma.db.platformAdmin.findUnique({ where: { email } });
    return row
      ? { id: row.id, email: row.email, name: row.name, passwordHash: row.passwordHash }
      : null;
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.prisma.db.platformAdmin.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }
}
