# 02 — Arquitetura

## 1. Princípios

| Princípio | Como se materializa |
|-----------|---------------------|
| **DDD** | Bounded contexts explícitos (ver §3). Linguagem ubíqua no código (`Order`, `LedgerEntry`, `StockCoverage`). |
| **Clean Architecture** | 4 camadas por módulo: `domain` → `application` → `infrastructure` → `presentation`. A regra de dependência aponta sempre para dentro. O domínio não importa Prisma, NestJS nem OpenAI. |
| **SOLID** | Interfaces (ports) no domínio; implementações (adapters) na infra. Inversão de dependência via DI do NestJS. |
| **Multi-tenant** | `company_id` em toda tabela tenant-scoped + PostgreSQL Row-Level Security. Tenant resolvido no guard de request e propagado por `AsyncLocalStorage`. |
| **Event-Driven** | Mudanças relevantes emitem eventos de domínio. Efeitos colaterais (sync, recálculo de DRE, IA, alertas) rodam assíncronos em BullMQ. |

## 2. C4 — Nível 1: Contexto

```mermaid
C4Context
  title Diagrama de Contexto — MarketMind AI

  Person(seller, "Vendedor / Gestor", "Usa o painel web e o app mobile")
  Person(accountant, "Contador", "Consome relatórios e DRE")

  System(mm, "MarketMind AI", "CFO inteligente para vendedores de marketplace")

  System_Ext(ml, "Mercado Livre API", "Pedidos, anúncios, perguntas, estoque")
  System_Ext(shopee, "Shopee / Amazon / Magalu", "Pedidos e catálogo")
  System_Ext(openai, "OpenAI", "LLM para IA executiva e agentes")
  System_Ext(notify, "WhatsApp / Email / Push", "Canais de alerta")
  System_Ext(pay, "Gateway de Pagamento", "Cobrança de assinatura")

  Rel(seller, mm, "Analisa lucro, estoque, preços; conversa com a IA")
  Rel(accountant, mm, "Baixa DRE e relatórios (PDF/Excel/CSV)")
  Rel(mm, ml, "OAuth2 + Webhooks + REST")
  Rel(mm, shopee, "Integrações (roadmap)")
  Rel(mm, openai, "Prompts com contexto de dados do tenant")
  Rel(mm, notify, "Dispara alertas")
  Rel(mm, pay, "Gerencia assinaturas")
```

## 3. C4 — Nível 2: Containers e Bounded Contexts

```mermaid
C4Container
  title Diagrama de Containers — MarketMind AI

  Person(seller, "Vendedor / Gestor")

  System_Boundary(mm, "MarketMind AI") {
    Container(web, "Web App", "Next.js 15 / React 19", "Dashboard, DRE, chat de IA")
    Container(mobile, "Mobile App", "React Native (Expo)", "KPIs e alertas")
    Container(api, "API / BFF", "NestJS", "REST + autenticação + orquestração de domínio")
    Container(workers, "Workers", "NestJS + BullMQ", "Sync de marketplace, DRE, IA, alertas")
    ContainerDb(pg, "PostgreSQL", "Supabase", "Dados tenant-scoped com RLS")
    ContainerDb(redis, "Redis", "Cache + filas BullMQ", "Cache, locks, filas de jobs")
    Container(blob, "Object Storage", "S3/Supabase Storage", "Relatórios PDF/Excel exportados")
  }

  System_Ext(ml, "Mercado Livre API")
  System_Ext(openai, "OpenAI")
  System_Ext(notify, "WhatsApp/Email/Push")

  Rel(seller, web, "HTTPS")
  Rel(seller, mobile, "HTTPS")
  Rel(web, api, "REST/JSON (JWT)")
  Rel(mobile, api, "REST/JSON (JWT)")
  Rel(api, pg, "Prisma")
  Rel(api, redis, "Cache + enfileira jobs")
  Rel(workers, redis, "Consome filas")
  Rel(workers, pg, "Prisma")
  Rel(workers, ml, "Sync OAuth2/REST")
  Rel(workers, openai, "Insights e chat")
  Rel(workers, notify, "Alertas")
  Rel(api, blob, "Gera/baixa relatórios")
```

## 4. Bounded Contexts (mapa de domínio)

```mermaid
graph TB
  subgraph Core
    IAM[Identity & Access<br/>users, companies, roles, RBAC]
    BILL[Billing<br/>subscriptions, plans, feature flags]
  end
  subgraph Integração
    INT[Marketplace Integration<br/>accounts, OAuth, webhooks, SDK]
  end
  subgraph Catálogo & Operação
    CAT[Catalog<br/>products, variants, costs]
    INV[Inventory<br/>stock, movements, coverage, forecast]
    SALES[Sales<br/>orders, items, customers]
  end
  subgraph Financeiro
    FIN[Finance<br/>transactions, cash flow, DRE, invoices]
    PRC[Pricing<br/>rules, min/ideal price, break-even]
  end
  subgraph Inteligência
    AI[AI Executive<br/>chat, insights, agents]
    COMP[Competition<br/>competitors, prices, history]
  end
  subgraph Plataforma
    NOTIF[Notifications<br/>alerts, channels]
    AUDIT[Audit & Observability<br/>audit_logs, events]
  end

  INT --> SALES
  INT --> CAT
  INT --> INV
  SALES --> FIN
  CAT --> FIN
  CAT --> PRC
  INV --> PRC
  FIN --> AI
  INV --> AI
  PRC --> AI
  COMP --> PRC
  AI --> NOTIF
  INV --> NOTIF
  FIN --> NOTIF
```

**Regra:** contexts comunicam-se por **eventos de domínio** (assíncrono) ou por **application
services** (síncrono, somente leitura cross-context). Nunca por acesso direto a tabelas de
outro context.

## 5. Camadas por módulo (Clean Architecture)

```
modules/finance/
├── domain/                 # Entidades, value objects, eventos, ports (interfaces). ZERO deps de infra.
│   ├── entities/
│   ├── value-objects/      # Money, TaxRegime, Percentage
│   ├── events/             # OrderSettled, DreRecalculated
│   └── ports/              # LedgerRepository, TaxCalculator (interfaces)
├── application/            # Casos de uso, orquestração, DTOs. Depende só de domain.
│   ├── use-cases/          # GenerateDre, RecalculateCashFlow
│   └── dto/
├── infrastructure/         # Adapters: Prisma repos, OpenAI, BullMQ, gateways externos.
│   ├── persistence/
│   ├── queue/
│   └── external/
└── presentation/           # Controllers NestJS, validação (Zod/class-validator), guards.
    └── http/
```

**Fluxo de dependência:** `presentation → application → domain ← infrastructure`.
A infraestrutura implementa as `ports` do domínio; o NestJS faz o wiring por DI.

## 6. Fluxo crítico — Ingestão de pedido → DRE

```mermaid
sequenceDiagram
  participant ML as Mercado Livre
  participant API as API (Webhook Controller)
  participant Q as Redis/BullMQ
  participant W as Worker (Integration)
  participant DB as PostgreSQL
  participant FW as Worker (Finance)
  participant N as Notifications

  ML->>API: POST /webhooks/ml (notification)
  API->>API: Valida assinatura + resolve tenant
  API->>Q: enqueue("ml.order.fetch", {topic, resourceId, companyId})
  API-->>ML: 200 OK (rápido, idempotente)
  W->>ML: GET /orders/{id} (token do tenant)
  W->>DB: upsert order + order_items (idempotente por external_id)
  W->>Q: emit event OrderImported
  FW->>FW: consome OrderImported
  FW->>DB: cria financial_transactions (comissão, frete, imposto, custo)
  FW->>DB: atualiza cash_flow + recalcula DRE incremental
  FW->>Q: emit event DreRecalculated
  N->>N: avalia regras (ex.: margem < limite) e dispara alerta
```

Pontos de robustez:
- Webhook responde **rápido e idempotente**; trabalho pesado vai para fila.
- `external_id` único por (`marketplace_account_id`, `external_id`) garante idempotência.
- Tokens OAuth criptografados em repouso; refresh automático em job dedicado.

## 7. Multi-tenancy

- Toda tabela tenant-scoped carrega `company_id` (FK → `companies`).
- **PostgreSQL Row-Level Security** ativo: policy filtra por `current_setting('app.current_company')`.
- O `TenantContext` (via `AsyncLocalStorage`) injeta o `company_id` no `SET LOCAL` por transação.
- Prisma usa um middleware/extension que aplica o tenant; isso é defesa em profundidade junto da RLS.
- Workers recebem `companyId` no payload do job e abrem a transação com o contexto correto.

Ver decisão detalhada em [ADR-0002](adr/0002-estrategia-multi-tenancy.md).

## 8. Observabilidade

- **Logs** estruturados (pino) com `requestId`, `companyId`, `userId` (sem PII sensível).
- **Métricas** Prometheus (latência por rota, profundidade de fila, taxa de erro de sync).
- **Tracing** OpenTelemetry ponta a ponta (web → api → worker).
- **Health checks** `/health` (liveness) e `/ready` (readiness com DB/Redis).

## 9. Mapeamento stack → arquitetura

| Necessidade | Tecnologia | Camada |
|-------------|-----------|--------|
| API HTTP + DI | NestJS | presentation/infrastructure |
| Persistência | Prisma + PostgreSQL | infrastructure |
| Cache/lock/fila | Redis + BullMQ | infrastructure |
| LLM | OpenAI SDK | infrastructure (adapter) |
| UI | Next.js + shadcn/ui | container web |
| Gráficos | Recharts | container web |
| Estado servidor | TanStack Query | container web |
