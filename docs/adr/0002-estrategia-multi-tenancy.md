# ADR-0002 — Multi-tenancy: coluna `company_id` + Row-Level Security

**Status:** Aceito · **Data:** 2026-06-15

## Contexto

Alvo de 100k usuários em muitos tenants. Precisamos de isolamento forte sem o custo operacional
de milhares de schemas/bancos, e defesa contra bugs de aplicação que vazariam dados entre tenants.

## Decisão

**Shared database, shared schema** com `company_id` em toda tabela tenant-scoped, reforçado por
**PostgreSQL Row-Level Security**. A aplicação define `SET LOCAL app.current_company` por
transação a partir do `TenantContext` (`AsyncLocalStorage`); as policies de RLS filtram por esse
valor. O middleware do Prisma adiciona o filtro como defesa em profundidade.

## Alternativas consideradas

- **Schema por tenant:** bom isolamento, mas migrations e conexões explodem na escala-alvo.
- **Banco por tenant:** isolamento máximo, custo e operação inviáveis para 100k usuários.
- **Só filtro na aplicação:** simples, mas um bug = vazamento entre tenants. Inaceitável.

## Consequências

- (+) Escala bem; uma migration serve todos os tenants.
- (+) RLS protege mesmo se a aplicação errar o filtro.
- (−) Toda query depende do contexto de tenant estar setado (coberto por testes e por default-deny).
- (−) Relatórios cross-tenant (admin) exigem role/conexão privilegiada explícita.
