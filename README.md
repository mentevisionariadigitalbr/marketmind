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

## Rodar localmente (do zero, em outro computador)

Pré-requisitos: **Node 20+**, **Docker** (Desktop) e **corepack** (vem com o Node).

```bash
# 1. Clonar e instalar (pnpm fixado via corepack)
git clone https://github.com/mentevisionariadigitalbr/marketmind.git
cd marketmind
corepack enable
pnpm install    # instala e gera o Prisma Client (via postinstall)
# se instalar com --ignore-scripts: pnpm --filter @marketmind/api exec prisma generate

# 2. Subir Postgres (host 5433) e Redis (host 6380)
pnpm db:up

# 3. Criar apps/api/.env (dev local) — cole o bloco abaixo

# 4. Criar o schema + o papel de RLS (marketmind_app) + policies
pnpm --filter @marketmind/api exec prisma migrate deploy

# 5. Semear: papéis/planos + usuário demo + admin de plataforma
pnpm --filter @marketmind/api run db:seed
# 5b. (opcional) dados de demonstração para os dashboards não ficarem zerados
pnpm --filter @marketmind/api run db:seed:demo

# 6. Rodar (dois terminais)
pnpm --filter @marketmind/api dev    # API em http://localhost:3333
pnpm --filter @marketmind/web dev    # Web em http://localhost:3000
```

Abra **http://localhost:3000** e entre com **`demo@marketmind.ai` / `Demo@12345`**
(admin da plataforma em `/admin/login`: **`admin@marketmind.ai` / `Admin@12345`**).

Conteúdo de **`apps/api/.env`** para dev local (secrets de desenvolvimento — troque em produção):

```dotenv
NODE_ENV=development
DATABASE_URL="postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public"
APP_DATABASE_URL="postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public"
REDIS_URL="redis://localhost:6380"
API_PORT=3333
CORS_ORIGIN="http://localhost:3000"
JWT_ACCESS_SECRET="dev-access-secret-change-me-please"
JWT_REFRESH_SECRET="dev-refresh-secret-change-me-please"
JWT_ADMIN_SECRET="dev-admin-secret-change-me-please"
TOKEN_ENCRYPTION_KEY="dev-token-encryption-key-change-me"
PLATFORM_ADMIN_EMAIL="admin@marketmind.ai"
PLATFORM_ADMIN_PASSWORD="Admin@12345"
```

Integrações externas (Mercado Livre, Stripe, Resend, Google) são **opcionais**: sem as chaves,
o sistema usa fallbacks no-op e o resto do app funciona normalmente. O **web** aponta para
`http://localhost:3333` por padrão (`NEXT_PUBLIC_API_URL` para mudar). Para produção, veja
[`docs/deployment.md`](docs/deployment.md) e use o `apps/api/.env.example` como base.

> **Reset dos dados de demo:** os testes de integração limpam empresas; rode
> `pnpm --filter @marketmind/api run db:seed && pnpm --filter @marketmind/api run db:seed:demo`
> para repovoar.
>
> **Conta "god" (todas as funções):** `pnpm --filter @marketmind/api run db:seed:god`
> cria/atualiza um OWNER com plano BUSINESS + acesso ao `/admin`, com dados populados.

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
- ✅ **E-mail transacional + recuperação de conta (Fase 4)**: provedor abstraído por porta
  (`EmailSender`, adaptador Resend, fallback noop sem `RESEND_API_KEY`); tabela `user_tokens`
  com RLS para tokens de uso único. **Recuperação de senha** (`POST /auth/forgot-password`
  sem enumeração + `POST /auth/reset-password`, token de 1h, uso único, revoga sessões) e
  **verificação de e-mail não-bloqueante** (`POST /auth/verify-email` + `/auth/resend-verification`,
  banner no app). Telas: `/forgot-password`, `/reset-password`, `/verify-email`.
- ✅ **Monetização — planos, pagamento e paywall (Fase 5)**: tabelas `plans` (catálogo global)
  + `subscriptions`/`invoices`/`usage_records` com RLS por company. Provedor de pagamento
  abstraído por porta de domínio (`PaymentProvider`); adapter **Stripe** (Checkout + Customer
  Portal hospedados, dunning nativo) com fallback noop sem `STRIPE_SECRET_KEY`. **Trial sem
  cartão de 14 dias** (provisionamento preguiçoso ancorado no cadastro), `GET /billing`
  (estado/limites/uso), `POST /billing/checkout` e `/billing/portal`. **Webhooks idempotentes**
  (`POST /billing/webhook/stripe`, assinatura verificada sobre o corpo cru, dedupe reusando
  `webhook_events`) que ativam/rebaixam a assinatura e registram faturas. **Paywall/gating**:
  `PlanGuard` + `EntitlementsService.assertWithinLimit/assertNotBlocked` (limite de contas de
  marketplace → HTTP 402; bloqueio em trial expirado/inadimplência) e banner no app. Tela
  `/dashboard/settings/billing` (planos, assinar, portal). Provedor de Pix/boleto (2º adapter)
  fica para fase seguinte.
- ✅ **Legal & LGPD (Fase 6)**: Termos/Privacidade/Cookies versionados (`/legal/*`) com
  **aceite registrado no cadastro** (`legal_acceptances` + RLS, versão/data/IP) — exigido
  no signup por senha e Google. **Banner de cookies** (necessários). **Direitos do titular**:
  `GET /privacy/export` (exporta os dados em JSON) e `POST /privacy/delete-account` (exclusão
  imediata — OWNER apaga a empresa e purga o negócio, demais anonimizam só a si; **retém
  faturas/assinaturas por obrigação fiscal**), com `data_subject_requests` (RLS) registrando
  cada pedido. Registro de tratamento e base legal em [`docs/lgpd.md`](docs/lgpd.md).
- ✅ **Área de Admin / Backoffice (Fase 7)**: papel **PLATFORM_ADMIN totalmente separado** do
  RBAC de tenant — tabela `platform_admins`, JWT com **segredo próprio** (`JWT_ADMIN_SECRET`) e
  `PlatformAdminGuard` (token de cliente → 403, provado por teste cripto-forte). Backoffice em
  `/admin`: **métricas SaaS** (MRR/ativos/churn/conversão, cross-tenant), **empresas/clientes**
  (assinaturas, faturas, inadimplência), **CRUD de planos & preços**, **saúde** (contas de
  marketplace, filas/`jobs`) e **auditoria** (`audit_logs`). **Impersonation somente-leitura e
  auditada** ("entrar como cliente": token de tenant `readOnly`+`impersonatedBy`, escrita
  bloqueada por interceptor global, com registro de quem entrou como quem e quando).
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
