# 04 — Estrutura de Pastas (Monorepo)

Monorepo gerenciado com **Turborepo + pnpm workspaces**. Justificativa em
[ADR-0001](adr/0001-monorepo-turborepo.md).

```
marketmind-ai/
├── apps/
│   ├── api/                      # NestJS — API/BFF (HTTP)
│   │   ├── src/
│   │   │   ├── modules/          # Bounded contexts (ver abaixo)
│   │   │   ├── shared/           # Guards, interceptors, filters, tenant context
│   │   │   ├── config/           # Configuração tipada (env via Zod)
│   │   │   └── main.ts
│   │   ├── test/                 # e2e (Jest + Supertest)
│   │   └── tsconfig.json
│   │
│   ├── workers/                  # NestJS standalone — consumidores BullMQ
│   │   └── src/
│   │       ├── processors/       # ml-sync, dre, ai-insights, notifications
│   │       └── main.ts
│   │
│   ├── web/                      # Next.js 15 (App Router)
│   │   ├── app/
│   │   │   ├── (auth)/           # login, signup, oauth callback
│   │   │   ├── (dashboard)/      # dashboard, dre, estoque, precos, ia, concorrencia
│   │   │   └── api/              # route handlers (proxy/BFF leve)
│   │   ├── components/           # shadcn/ui + componentes de domínio
│   │   ├── lib/                  # api client, query hooks (TanStack)
│   │   └── tests/
│   │
│   └── mobile/                   # React Native (Expo) — Sprint 6
│       └── src/
│
├── packages/
│   ├── domain/                   # OPCIONAL: tipos/contratos compartilhados de domínio
│   ├── sdk-mercadolivre/         # SDK próprio do Mercado Livre (cliente tipado)
│   │   └── src/
│   │       ├── resources/        # orders, items, questions, categories, users
│   │       ├── auth/             # oauth2, token refresh
│   │       └── http/             # cliente com retry/backoff/rate-limit
│   ├── contracts/                # DTOs/Zod schemas compartilhados api <-> web
│   ├── ui/                       # design system (shadcn) reusável web/mobile
│   ├── config-eslint/            # ESLint compartilhado
│   ├── config-tsconfig/          # tsconfig base
│   └── observability/            # logger pino + otel helpers
│
├── prisma/
│   ├── schema.prisma             # modelo único (ver doc 03)
│   ├── migrations/
│   └── seed.ts
│
├── infra/
│   ├── docker/
│   │   ├── api.Dockerfile
│   │   ├── workers.Dockerfile
│   │   └── web.Dockerfile
│   ├── docker-compose.yml        # postgres, redis, api, workers, web (dev)
│   └── github-actions/           # workflows reaproveitáveis
│
├── docs/                         # esta documentação
│   └── adr/
│
├── .github/workflows/            # ci.yml, deploy.yml
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Estrutura de um módulo (bounded context) na API

Repetida para cada context. Exemplo: `apps/api/src/modules/finance/`.

```
finance/
├── domain/
│   ├── entities/
│   │   ├── ledger-entry.entity.ts
│   │   └── dre-statement.entity.ts
│   ├── value-objects/
│   │   ├── money.vo.ts
│   │   └── tax-regime.vo.ts
│   ├── events/
│   │   └── dre-recalculated.event.ts
│   └── ports/
│       ├── ledger.repository.ts        # interface
│       └── tax-calculator.port.ts      # interface
├── application/
│   ├── use-cases/
│   │   ├── generate-dre.use-case.ts
│   │   └── recalculate-cash-flow.use-case.ts
│   └── dto/
├── infrastructure/
│   ├── persistence/
│   │   └── prisma-ledger.repository.ts # implements LedgerRepository
│   ├── tax/
│   │   └── simples-nacional.calculator.ts
│   └── queue/
│       └── dre.processor.ts
├── presentation/
│   └── http/
│       ├── finance.controller.ts
│       └── dto/
└── finance.module.ts                   # wiring NestJS (providers, ports->adapters)
```

## Convenções de nomenclatura

- Arquivos: `kebab-case` com sufixo de papel (`.use-case.ts`, `.repository.ts`, `.entity.ts`).
- Classes: `PascalCase`. Interfaces (ports) sem prefixo `I` — nome de papel (`LedgerRepository`).
- Um caso de uso = uma classe com um único método público `execute()`.
- Testes ao lado do arquivo (`*.spec.ts`) para unit; `apps/*/test` para e2e.
