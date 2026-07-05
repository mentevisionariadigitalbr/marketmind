import { Injectable } from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import {
  AdminCompaniesRepository,
  CompanyDetail,
  CompanyListPage,
  CompanySubscriptionView,
} from '../domain/ports/admin-companies.repository';

const VALID_STATUS = new Set(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE']);

type SubWithPlan = {
  status: string;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  plan: { code: string; name: string } | null;
};

function subView(s: SubWithPlan | null): CompanySubscriptionView | null {
  if (!s) return null;
  return {
    status: s.status,
    planCode: s.plan?.code ?? null,
    planName: s.plan?.name ?? null,
    currentPeriodEnd: s.currentPeriodEnd ? s.currentPeriodEnd.toISOString() : null,
    trialEndsAt: s.trialEndsAt ? s.trialEndsAt.toISOString() : null,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
  };
}

/**
 * Empresas/clientes lidos SEM contexto de tenant (admin → GUC vazia → RLS aberta):
 * a leitura é agregada da plataforma. Nunca expõe tokens de marketplace.
 */
@Injectable()
export class PrismaAdminCompaniesRepository implements AdminCompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCompanies(params: { page: number; pageSize: number; status?: string }): Promise<CompanyListPage> {
    const page = Math.max(1, Math.floor(params.page) || 1);
    const pageSize = Math.min(Math.max(Math.floor(params.pageSize) || 20, 1), 100);
    const where: Prisma.CompanyWhereInput =
      params.status && VALID_STATUS.has(params.status)
        ? { subscription: { is: { status: params.status as SubscriptionStatus } } }
        : {};

    const [rows, total] = await Promise.all([
      this.prisma.db.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          subscription: { include: { plan: { select: { code: true, name: true } } } },
          _count: { select: { users: true } },
        },
      }),
      this.prisma.db.company.count({ where }),
    ]);

    return {
      items: rows.map((c) => ({
        id: c.id,
        name: c.name,
        taxId: c.taxId,
        createdAt: c.createdAt.toISOString(),
        usersCount: c._count.users,
        subscription: subView(c.subscription as SubWithPlan | null),
      })),
      total,
      page,
      pageSize,
    };
  }

  async getCompanyDetail(id: string): Promise<CompanyDetail | null> {
    const c = await this.prisma.db.company.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: { select: { code: true, name: true } } } },
        users: {
          select: { id: true, name: true, email: true, role: true, status: true, emailVerifiedAt: true },
          orderBy: { createdAt: 'asc' },
        },
        invoices: { orderBy: { issuedAt: 'desc' }, take: 100 },
        marketplaceAccounts: {
          select: { id: true, nickname: true, externalUserId: true, status: true, lastSyncedAt: true },
        },
      },
    });
    if (!c) return null;

    const sub = c.subscription as (SubWithPlan & { provider: string | null; createdAt: Date }) | null;
    return {
      company: {
        id: c.id,
        name: c.name,
        taxId: c.taxId,
        taxRegime: c.taxRegime,
        createdAt: c.createdAt.toISOString(),
      },
      subscription: sub
        ? { ...subView(sub)!, provider: sub.provider, createdAt: sub.createdAt.toISOString() }
        : null,
      users: c.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        emailVerified: u.emailVerifiedAt !== null,
      })),
      invoices: c.invoices.map((i) => ({
        id: i.id,
        provider: i.provider,
        amountCents: i.amountCents,
        currency: i.currency,
        status: i.status,
        paymentMethod: i.paymentMethod,
        issuedAt: i.issuedAt.toISOString(),
        paidAt: i.paidAt ? i.paidAt.toISOString() : null,
        hostedUrl: i.hostedUrl,
      })),
      marketplaceAccounts: c.marketplaceAccounts.map((a) => ({
        id: a.id,
        nickname: a.nickname,
        externalUserId: a.externalUserId,
        status: a.status,
        lastSyncedAt: a.lastSyncedAt ? a.lastSyncedAt.toISOString() : null,
      })),
    };
  }
}
