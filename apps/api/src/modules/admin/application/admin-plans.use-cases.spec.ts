import {
  CreatePlanUseCase,
  GetPlanUseCase,
  UpdatePlanUseCase,
} from './admin-plans.use-cases';
import {
  AdminPlanView,
  AdminPlansRepository,
  CreatePlanData,
  UpdatePlanData,
} from '../domain/ports/admin-plans.repository';
import { PlanCodeInUseError } from '../domain/errors';
import { NotFoundError } from '../../iam/application/errors';

function view(p: Partial<AdminPlanView>): AdminPlanView {
  return {
    id: 'p1', code: 'PRO', name: 'Pro', priceCents: 9900, currency: 'BRL', interval: 'month',
    trialDays: 14, maxMarketplaceAccounts: 3, maxProducts: 5000, historyWindowDays: 365,
    stripePriceId: null, active: true, createdAt: '2026-06-25T00:00:00.000Z', ...p,
  };
}

class FakeRepo implements AdminPlansRepository {
  created: CreatePlanData | null = null;
  updated: { id: string; data: UpdatePlanData } | null = null;
  constructor(private readonly existing: AdminPlanView[] = []) {}
  async listAll() { return this.existing; }
  async findById(id: string) { return this.existing.find((p) => p.id === id) ?? null; }
  async create(data: CreatePlanData) {
    if (this.existing.some((p) => p.code === data.code)) throw new PlanCodeInUseError(data.code);
    this.created = data;
    return view({ ...data, id: 'new', createdAt: '2026-06-25T00:00:00.000Z' } as Partial<AdminPlanView>);
  }
  async update(id: string, data: UpdatePlanData) {
    const found = this.existing.find((p) => p.id === id);
    if (!found) return null;
    this.updated = { id, data };
    return view({ ...found, ...data });
  }
}

describe('CreatePlanUseCase', () => {
  it('normaliza code (UPPER/trim) e aplica defaults', async () => {
    const repo = new FakeRepo();
    await new CreatePlanUseCase(repo).execute({ code: ' starter ', name: ' Starter ', priceCents: 4900, interval: 'month' });
    expect(repo.created).toMatchObject({
      code: 'STARTER', name: 'Starter', currency: 'BRL', trialDays: 14,
      maxMarketplaceAccounts: null, maxProducts: null, historyWindowDays: null, stripePriceId: null,
    });
  });

  it('rejeita código duplicado com 409 (PlanCodeInUseError)', async () => {
    const repo = new FakeRepo([view({ id: 'p1', code: 'PRO' })]);
    await expect(
      new CreatePlanUseCase(repo).execute({ code: 'pro', name: 'X', priceCents: 1, interval: 'month' }),
    ).rejects.toBeInstanceOf(PlanCodeInUseError);
  });
});

describe('UpdatePlanUseCase / GetPlanUseCase', () => {
  it('atualiza um plano existente', async () => {
    const repo = new FakeRepo([view({ id: 'p1' })]);
    const res = await new UpdatePlanUseCase(repo).execute('p1', { priceCents: 12900, active: false });
    expect(res.priceCents).toBe(12900);
    expect(repo.updated?.data).toEqual({ priceCents: 12900, active: false });
  });

  it('404 ao atualizar/buscar plano inexistente', async () => {
    const repo = new FakeRepo();
    await expect(new UpdatePlanUseCase(repo).execute('nope', { priceCents: 1 })).rejects.toBeInstanceOf(NotFoundError);
    await expect(new GetPlanUseCase(repo).execute('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});
