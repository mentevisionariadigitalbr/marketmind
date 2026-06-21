import { DeleteMyAccountUseCase } from './delete-my-account.use-case';
import { ExportMyDataUseCase } from './export-my-data.use-case';
import {
  DataSubjectScope,
  DataSubjectType,
  PrivacyRepository,
  UserDataExport,
} from '../domain/ports/privacy.repository';
import {
  LegalAcceptanceRecord,
  LegalAcceptanceRepository,
  RecordAcceptanceData,
} from '../../legal/domain/ports/legal-acceptance.repository';

class FakePrivacyRepo implements PrivacyRepository {
  requests: { type: DataSubjectType; scope: DataSubjectScope; userId: string }[] = [];
  deletions: { requesterUserId: string; companyId: string; scope: DataSubjectScope }[] = [];
  exportPayload: UserDataExport = {
    profile: { id: 'u1', name: 'Ana', email: 'ana@a.com', role: 'OWNER', status: 'ACTIVE', emailVerified: true, createdAt: '2026-01-01T00:00:00.000Z' },
    company: { id: 'c1', name: 'Loja', taxId: null, taxRegime: 'SIMPLES_NACIONAL', createdAt: '2026-01-01T00:00:00.000Z' },
    sessions: [],
    auditLog: [],
  };
  async exportUserData() { return this.exportPayload; }
  async recordRequest(d: { userId: string; companyId: string; type: DataSubjectType; scope: DataSubjectScope }) {
    this.requests.push({ type: d.type, scope: d.scope, userId: d.userId });
  }
  async deleteAccount(d: { requesterUserId: string; companyId: string; scope: DataSubjectScope }) {
    this.deletions.push(d);
  }
}

class FakeAcceptanceRepo implements LegalAcceptanceRepository {
  async record(_d: RecordAcceptanceData) { /* noop */ }
  async listForUser(): Promise<LegalAcceptanceRecord[]> {
    return [{ documentType: 'TERMS', version: '2026-06-22', acceptedAt: new Date('2026-06-22T00:00:00Z') }];
  }
}

describe('DeleteMyAccountUseCase', () => {
  it('OWNER exclui a empresa inteira (escopo COMPANY)', async () => {
    const repo = new FakePrivacyRepo();
    const res = await new DeleteMyAccountUseCase(repo).execute({ userId: 'u1', companyId: 'c1', role: 'OWNER' });
    expect(res.scope).toBe('COMPANY');
    expect(repo.deletions[0]).toEqual({ requesterUserId: 'u1', companyId: 'c1', scope: 'COMPANY' });
  });

  it.each(['MEMBER', 'ADMIN'])('%s exclui apenas a si (escopo USER)', async (role) => {
    const repo = new FakePrivacyRepo();
    const res = await new DeleteMyAccountUseCase(repo).execute({ userId: 'u2', companyId: 'c1', role });
    expect(res.scope).toBe('USER');
    expect(repo.deletions[0].scope).toBe('USER');
  });
});

describe('ExportMyDataUseCase', () => {
  it('registra o pedido e devolve os dados pessoais + aceites', async () => {
    const repo = new FakePrivacyRepo();
    const result = await new ExportMyDataUseCase(repo, new FakeAcceptanceRepo()).execute({
      userId: 'u1',
      companyId: 'c1',
    });

    expect(repo.requests[0]).toEqual({ type: 'EXPORT', scope: 'USER', userId: 'u1' });
    expect(result.profile?.email).toBe('ana@a.com');
    expect(result.legalAcceptances).toHaveLength(1);
    expect(result.legalAcceptances[0].documentType).toBe('TERMS');
    expect(result.generatedAt).toBeTruthy();
  });
});
