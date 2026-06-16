# MarketMind AI

> O CFO Inteligente para Vendedores de Marketplace.

MarketMind AI é uma plataforma SaaS multi-tenant que atua como **CFO, Controller e Analista
de Dados** para vendedores de marketplace (Mercado Livre, Shopee, Amazon, Magalu). O sistema
responde, com base em dados reais do vendedor, perguntas que hoje ele não consegue responder:

- Quanto **realmente** lucro (depois de comissões, frete, impostos, custos e despesas)?
- O que e quanto preciso comprar, e quando o estoque vai acabar?
- Quais anúncios dão prejuízo?
- Como devo precificar para bater minha margem-alvo?
- Onde estou perdendo dinheiro?

## Estado atual do repositório

A **FASE 1 — Arquitetura** e o **Sprint 1 — Fundação & Autenticação Multi-tenant** estão
**concluídos**: monorepo de pé, banco modelado e migrado, autenticação completa com RBAC,
isolamento multi-tenant verificável e CI. A construção segue o
[roadmap](docs/05-roadmap.md) em incrementos verificáveis.

| Fase | Entregável | Status |
|------|------------|--------|
| 1 | Arquitetura corporativa (este conjunto de docs) | ✅ Concluída |
| 2 | Fundação do monorepo + autenticação multi-tenant (Sprint 1) | ✅ Concluída |
| 3 | Integração Mercado Livre + ingestão de pedidos (Sprint 2) | ⏳ Próximo |
| 4 | DRE + Dashboard executivo (Sprint 3) | ⏳ |
| 5 | Estoque inteligente + Precificação (Sprint 4) | ⏳ |
| 6 | IA executiva + Agentes de negócio (Sprint 5) | ⏳ |
| 7 | Concorrência + Alertas + Mobile + Hardening (Sprint 6) | ⏳ |

### Sprint 1 — entregue e verificado

- ✅ **IAM (DDD/hexagonal)** em `apps/api/src/modules/iam`: signup, login, refresh token
  rotativo (com detecção de reúso), logout e `GET /auth/me`.
- ✅ **RBAC**: tabelas `roles`/`permissions`/`role_permissions`/`user_roles`, catálogo de
  permissões semeado, papéis de sistema (OWNER/ADMIN/MEMBER), permissões embutidas no access
  token e guard `@RequirePermissions` (`GET /iam/roles` exige `iam:read`).
- ✅ **Isolamento multi-tenant por Row-Level Security** (ADR-0002): a API conecta com uma role
  de menor privilégio (`APP_DATABASE_URL`) e o `PrismaService` fixa `app.current_company` por
  transação; as policies do PostgreSQL barram acesso cross-tenant.
- ✅ **Auditoria**: tabela `audit_logs` + `AuditInterceptor` global (ator, tenant, ação, método,
  rota, status, IP, user-agent, timestamp).
- ✅ **Login social Google (OAuth2)**: `POST /auth/google` — login, vínculo de conta por e-mail
  e cadastro automático (cria empresa + usuário OWNER).
- ✅ **`apps/web`** (Next.js 15 / React 19): login, cadastro, onboarding e dashboard inicial,
  com sessão em cookies httpOnly e proteção de rotas por middleware.
- ✅ **CI** (`.github/workflows/ci.yml`): Postgres de serviço, lint, typecheck, testes
  unitários + integração e build.

**Verificação:** 24 testes unitários + 11 de integração (RLS/RBAC/auditoria contra Postgres
real) verdes; `tsc` limpo; ESLint sem erros; `apps/api` e `apps/web` compilam.

> **Pré-requisito local:** subir o banco com `pnpm db:up`, aplicar migrations
> (`pnpm --filter @marketmind/api exec prisma migrate deploy`) e semear
> (`pnpm --filter @marketmind/api db:seed`) antes de rodar `test:int` ou a API.

## Documentação

1. [Visão de Produto](docs/01-visao-de-produto.md)
2. [Arquitetura](docs/02-arquitetura.md)
3. [Modelo de Dados](docs/03-modelo-de-dados.md)
4. [Estrutura de Pastas](docs/04-estrutura-de-pastas.md)
5. [Roadmap & Backlog](docs/05-roadmap.md)
6. [Segurança & Compliance](docs/06-seguranca.md)
7. [ADRs (Architecture Decision Records)](docs/adr/)

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui, Recharts, TanStack Query |
| Backend | NestJS, Node.js, TypeScript |
| Banco | PostgreSQL (via Supabase) + Prisma |
| Cache / Filas | Redis + BullMQ |
| IA | OpenAI |
| Auth | JWT + Refresh Token + RBAC + Google OAuth |
| Mobile | React Native (Expo) |
| Infra | Docker, GitHub Actions, Vercel, Railway, Cloudflare |

## Princípios de engenharia

- **DDD** — domínio modelado em bounded contexts explícitos.
- **Clean Architecture** — regra de dependência apontando para dentro; domínio não conhece infraestrutura.
- **SOLID** — em todas as camadas.
- **Multi-tenant** — isolamento por `company_id` com Row-Level Security no PostgreSQL.
- **Event-Driven** — efeitos colaterais (sync, IA, alertas) via eventos de domínio + BullMQ.

## Convenções

- Documentação em **português** (produto brasileiro).
- Código, identificadores e mensagens de commit em **inglês**.
- Conventional Commits.
- Nenhum código entra na `main` sem testes verdes e revisão.
