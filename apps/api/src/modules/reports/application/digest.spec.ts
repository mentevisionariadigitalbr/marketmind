import { isDigestDue, composeDigest, type DigestData } from './digest';

describe('isDigestDue', () => {
  const now = new Date('2026-06-26T12:00:00Z');
  it('nunca enviado → sempre devido', () => {
    expect(isDigestDue('DAILY', null, now)).toBe(true);
    expect(isDigestDue('WEEKLY', null, now)).toBe(true);
  });
  it('diário: devido após ~23h', () => {
    expect(isDigestDue('DAILY', new Date(now.getTime() - 22 * 3600_000), now)).toBe(false);
    expect(isDigestDue('DAILY', new Date(now.getTime() - 24 * 3600_000), now)).toBe(true);
  });
  it('semanal: devido após ~7 dias', () => {
    expect(isDigestDue('WEEKLY', new Date(now.getTime() - 5 * 24 * 3600_000), now)).toBe(false);
    expect(isDigestDue('WEEKLY', new Date(now.getTime() - 7 * 24 * 3600_000), now)).toBe(true);
  });
});

describe('composeDigest', () => {
  const data: DigestData = {
    companyName: 'Loja X',
    revenue7d: 12345.6,
    orders7d: 42,
    units7d: 50,
    outOfStock: 3,
    lowStock: 5,
    payablesPending: 2000,
    payablesOverdue: 500,
  };
  it('inclui assunto com a receita e o corpo com os números', () => {
    const email = composeDigest('WEEKLY', data);
    expect(email.subject).toContain('semanal');
    expect(email.subject).toContain('R$');
    expect(email.html).toContain('Loja X');
    expect(email.html).toContain('42'); // pedidos
    expect(email.text).toContain('Itens sem estoque: 3');
  });
});
