import {
  CreatePayableUseCase,
  PayPayableUseCase,
  GetCashflowProjectionUseCase,
} from './cashflow.use-cases';
import {
  CashEntryRow,
  CashflowRepository,
  CreatePayableData,
  PayableRow,
  ReceivableRow,
} from '../domain/ports/cashflow.repository';
import { NotFoundError, ValidationError } from '../../iam/application/errors';

class FakeRepo implements CashflowRepository {
  suppliers = new Set<string>();
  created: CreatePayableData[] = [];
  paidOk = true;
  inflows: CashEntryRow[] = [];
  outflows: CashEntryRow[] = [];

  async createPayable(d: CreatePayableData) {
    this.created.push(d);
    return 'pay1';
  }
  async listPayables(): Promise<PayableRow[]> {
    return [];
  }
  async markPaid() {
    return this.paidOk;
  }
  async supplierExists(id: string) {
    return this.suppliers.has(id);
  }
  async payableEntries() {
    return this.outflows;
  }
  async receivableEntries() {
    return this.inflows;
  }
  async recentReceivables(): Promise<ReceivableRow[]> {
    return [];
  }
}

describe('CreatePayableUseCase', () => {
  let repo: FakeRepo;
  let uc: CreatePayableUseCase;
  beforeEach(() => {
    repo = new FakeRepo();
    uc = new CreatePayableUseCase(repo);
  });

  it('rejeita valor não positivo', async () => {
    await expect(uc.execute({ amount: 0, dueDate: '2026-07-01', createdBy: 'u' })).rejects.toBeInstanceOf(ValidationError);
  });
  it('rejeita vencimento inválido', async () => {
    await expect(uc.execute({ amount: 10, dueDate: 'xx', createdBy: 'u' })).rejects.toBeInstanceOf(ValidationError);
  });
  it('valida fornecedor informado', async () => {
    await expect(uc.execute({ amount: 10, dueDate: '2026-07-01', supplierId: 'ghost', createdBy: 'u' })).rejects.toBeInstanceOf(NotFoundError);
  });
  it('cria conta a pagar manual', async () => {
    await uc.execute({ amount: 150, dueDate: '2026-07-01', description: ' aluguel ', createdBy: 'u' });
    expect(repo.created[0]).toMatchObject({ amount: 150, description: 'aluguel' });
  });
});

describe('PayPayableUseCase', () => {
  it('falha quando não há conta pendente', async () => {
    const repo = new FakeRepo();
    repo.paidOk = false;
    await expect(new PayPayableUseCase(repo).execute('x')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('GetCashflowProjectionUseCase', () => {
  it('monta semanas, soma totais e identifica vencidos', async () => {
    const repo = new FakeRepo();
    const now = new Date('2026-06-25T00:00:00Z');
    repo.inflows = [{ date: '2026-06-23T00:00:00Z', amount: 1000 }];
    repo.outflows = [
      { date: '2026-06-24T00:00:00Z', amount: 400 }, // vencido (antes de now)
      { date: '2026-07-06T00:00:00Z', amount: 100 }, // futuro
    ];
    const proj = await new GetCashflowProjectionUseCase(repo).execute(now);
    expect(proj.totals.inflow).toBe(1000);
    expect(proj.totals.outflow).toBe(500);
    expect(proj.totals.net).toBe(500);
    expect(proj.totals.overdueAmount).toBe(400);
    expect(proj.weeks.length).toBe(13); // 4 atrás + atual + 8 à frente
    expect(proj.weeks[proj.weeks.length - 1].balance).toBe(500);
  });
});
