# Arquitetura v2 — Foundation (Sprint 2.7)

Refactor de fundação: eliminação do acoplamento `apps/workers → apps/api` e
criação de um núcleo compartilhado em `packages/`. Sem novas funcionalidades —
preparação para 3 anos de evolução (multi-marketplace).

## Packages

| Package | Responsabilidade | Depende de |
|---------|------------------|------------|
| `@marketmind/kernel` | Fundamentos: `ApplicationError`/`DomainError`/`ValidationError`, `Result`/`Either`, `BaseEntity`/`AggregateRoot`, `TenantContext` (+ correlation/request/trace), contratos `Logger`/`Clock`/`IdGenerator`/`Tracer`, `PrismaService` | — |
| `@marketmind/integration-core` | Contexto de integração: ports, DTOs, event contracts, use cases, mappers, session, repos Prisma, adapters de marketplace, crypto de tokens | kernel, queue, sdk |
| `@marketmind/marketplace-core` | Abstrações multi-marketplace: `MarketplaceCode`, `MarketplaceAdapter`/`Provider`, `MarketplaceRegistry`/`Factory` | kernel |
| `@marketmind/queue` | Abstração de filas (BullMQ), retry/DLQ, logger, circuit breaker, métricas | — |
| `@marketmind/sdk-mercadolivre` | SDK tipado do Mercado Livre | — |
| `@marketmind/architecture` | Testes de fronteira/segurança (dependency rule) | — |

## Dependency graph

```
                         ┌─────────────┐
                         │   kernel    │  (sem dependências @marketmind)
                         └──────▲──────┘
            ┌───────────────────┼───────────────────┐
            │                   │                   │
   ┌────────┴────────┐  ┌───────┴────────┐   ┌──────┴───────┐
   │ integration-core│  │ marketplace-   │   │    queue     │
   │ (← queue, sdk)  │  │ core           │   │     sdk      │
   └────────▲────────┘  └───────▲────────┘   └──────────────┘
            │                   │
   ┌────────┴───────────────────┴────────┐
   │            apps/api                  │     apps/workers ─┐
   │  (HTTP/BFF, IAM, controllers, wiring)│                   │
   └─────────────────────────────────────┘   ┌───────────────┴──────────────┐
   apps/web ─────────────────────────────────│ (processors, schedulers,      │
                                              │  jobs mirror, health)         │
                                              └───────────────────────────────┘

Regra: apps/* → integration-core / marketplace-core → kernel.
PROIBIDO: workers→api, api→workers, web→api, web→workers, packages→apps.
Validado por dependency-cruiser + testes de fronteira (jest).
```

### Diagrama de execução

```
API     → integration-core → (marketplace-core) → MercadoLivre adapter → Mercado Livre
Worker  → integration-core → (marketplace-core) → MercadoLivre adapter → Mercado Livre
```

Ambos consomem os MESMOS use cases/adapters do `integration-core`. Nenhuma app
depende de outra app.

## Fluxos (preservados, sem regressão)

OAuth · Orders Sync · Catalog/Inventory/Price/Category/Variation Sync · Webhooks
(fan-out) · Workers/Filas · Retry · DLQ · Scheduler · Circuit Breaker.

`Webhook → API (ACK rápido, outbox) → BullMQ → Worker (integration-core use cases) → Postgres (RLS)`.

## Marketplace strategy (multi-marketplace)

`MarketplaceRegistry` (Open/Closed): novos marketplaces entram por
`registry.register(provider)` **sem alterar código existente**.

```ts
const registry = new MarketplaceRegistry()
  .register(mercadoLivreProvider);  // hoje
  // .register(shopeeProvider)      // amanhã — sem tocar no resto
const adapter = new MarketplaceFactory(registry).forAccount(account);
await adapter.syncOrders({ accountId });
```

`MarketplaceCode = MERCADO_LIVRE | SHOPEE | AMAZON | MAGALU | CUSTOM`. O contrato
`MarketplaceAdapter` (orders/catalog/inventory/refresh + `capabilities`) é
uniforme — a regra de negócio nunca conhece uma API específica.

## Tenant & correlation propagation

`TenantContext` (kernel) carrega `companyId`, `userId`, `role`,
`correlationId`, `requestId`, `traceId`, propagado via `AsyncLocalStorage`:

```
API (interceptor) → TenantContext → JobDispatcher (correlationId no payload)
   → Worker (runWithTenant por job) → PrismaService.runInTransaction
   → SET LOCAL app.current_company  → RLS no Postgres
```

O worker reidrata o contexto por job (`withTenant(companyId, …)`), garantindo
RLS fora do request HTTP.

## Observabilidade (abstrações, prontas para OpenTelemetry)

- **Logs** — JSON estruturado com redaction (queue) + contrato `Logger` (kernel).
- **Métricas** — `MetricsRegistry` (Prometheus): jobs + catálogo.
- **Eventos** — contratos tipados (`OrderCreatedEvent`, `CatalogUpdatedEvent`,
  `PriceChangedEvent`, `WebhookReceivedEvent`, `JobFailedEvent`, …).
- **Tracing** — contratos `Tracer`/`Span` + `NoopTracer` (placeholder; plugar
  OpenTelemetry = nova implementação, sem tocar no domínio).

## Segurança

Nenhum package embute tokens/segredos/credenciais (teste de fronteira de
segurança). Tokens de marketplace permanecem cifrados em repouso (AES-256-GCM,
`integration-core/crypto`); redaction nos logs.

## Compatibilidade

`apps/api` mantém **shims de re-export** (`shared/prisma`, `shared/tenant`,
`shared/crypto`, `shared/queue`, `iam/application/errors`) apontando para os
packages — zero quebra de imports internos durante a transição.
