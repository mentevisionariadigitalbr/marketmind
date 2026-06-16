import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { User, UserRole, UserStatus } from '../../domain/entities/user.entity';
import { CreateUserData, UserRepository } from '../../domain/ports/user.repository';

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

  async create(data: CreateUserData): Promise<User> {
    const row = await this.prisma.db.user.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash ?? undefined,
        googleId: data.googleId ?? undefined,
        role: data.role ?? undefined,
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
