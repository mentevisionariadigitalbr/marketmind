import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  RbacRepository,
  RoleSummary,
  UserAuthorization,
} from '../../domain/ports/rbac.repository';
import { NotFoundError } from '../../application/errors';

@Injectable()
export class PrismaRbacRepository implements RbacRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectiveAuthorization(userId: string): Promise<UserAuthorization> {
    const assignments = await this.prisma.db.userRoleAssignment.findMany({
      where: { userId },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    const roles = new Set<string>();
    const permissions = new Set<string>();
    for (const a of assignments) {
      roles.add(a.role.name);
      for (const rp of a.role.permissions) {
        permissions.add(rp.permission.key);
      }
    }
    return { roles: [...roles], permissions: [...permissions] };
  }

  async assignSystemRole(userId: string, roleName: string): Promise<void> {
    const role = await this.prisma.db.role.findFirst({
      where: { name: roleName, companyId: null, isSystem: true },
      select: { id: true },
    });
    if (!role) {
      throw new NotFoundError(`Papel de sistema "${roleName}"`);
    }
    await this.prisma.db.userRoleAssignment.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      create: { userId, roleId: role.id },
      update: {},
    });
  }

  async listRoles(companyId: string): Promise<RoleSummary[]> {
    const roles = await this.prisma.db.role.findMany({
      where: { OR: [{ companyId }, { companyId: null }] },
      include: { permissions: { include: { permission: true } } },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.permissions.map((rp) => rp.permission.key),
    }));
  }
}
