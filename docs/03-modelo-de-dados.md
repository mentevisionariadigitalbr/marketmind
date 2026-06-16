# 03 — Modelo de Dados

Banco: **PostgreSQL**. ORM: **Prisma**. Multi-tenant por `company_id` + **Row-Level Security**.

Convenções:
- PK: `id` (`uuid`, default `gen_random_uuid()`).
- Toda tabela tenant-scoped tem `company_id uuid NOT NULL` (FK → `companies`) + index.
- Timestamps: `created_at`, `updated_at` (`timestamptz`). Soft-delete (`deleted_at`) onde fizer sentido.
- Dinheiro: `numeric(14,2)` (nunca float). Percentuais: `numeric(7,4)`.
- Enums via Prisma enum (tipos PG nativos).

## 1. ERD — Núcleo (Tenancy, IAM, Billing)

```mermaid
erDiagram
  companies ||--o{ users : has
  companies ||--o{ marketplace_accounts : owns
  companies ||--|| subscriptions : has
  companies ||--o{ audit_logs : records
  companies ||--o{ feature_flags : toggles
  users ||--o{ user_roles : assigned
  roles ||--o{ user_roles : grants
  roles ||--o{ role_permissions : has
  permissions ||--o{ role_permissions : in

  companies {
    uuid id PK
    string name
    string tax_id "CNPJ"
    string tax_regime "enum"
    timestamptz created_at
  }
  users {
    uuid id PK
    uuid company_id FK
    string email UK
    string password_hash "nullable (OAuth)"
    string google_id "nullable"
    string status "enum"
  }
  subscriptions {
    uuid id PK
    uuid company_id FK
    string plan "enum"
    string status "enum"
    timestamptz current_period_end
  }
  roles { uuid id PK; uuid company_id FK; string name }
  permissions { uuid id PK; string key UK; string description }
  user_roles { uuid user_id FK; uuid role_id FK }
  role_permissions { uuid role_id FK; uuid permission_id FK }
  audit_logs {
    uuid id PK
    uuid company_id FK
    uuid actor_id
    string action
    string entity
    jsonb diff
    timestamptz created_at
  }
  feature_flags { uuid id PK; uuid company_id FK; string key; boolean enabled }
```

## 2. ERD — Catálogo, Estoque e Vendas

```mermaid
erDiagram
  marketplace_accounts ||--o{ products : lists
  marketplaces ||--o{ marketplace_accounts : type
  products ||--o{ product_variants : has
  products ||--o{ product_costs : costed_by
  product_variants ||--o{ inventory : tracked
  inventory ||--o{ inventory_movements : logs
  suppliers ||--o{ product_costs : supplies
  marketplace_accounts ||--o{ orders : receives
  orders ||--o{ order_items : contains
  customers ||--o{ orders : places
  product_variants ||--o{ order_items : sold_as

  marketplaces { uuid id PK; string code "ML/SHOPEE/AMAZON/MAGALU"; string name }
  marketplace_accounts {
    uuid id PK
    uuid company_id FK
    uuid marketplace_id FK
    string external_user_id
    text access_token_enc
    text refresh_token_enc
    timestamptz token_expires_at
    string status
  }
  products {
    uuid id PK
    uuid company_id FK
    uuid marketplace_account_id FK
    string sku
    string external_id "MLB..."
    string title
    string status
  }
  product_variants { uuid id PK; uuid company_id FK; uuid product_id FK; string sku; jsonb attributes }
  product_costs {
    uuid id PK
    uuid company_id FK
    uuid product_id FK
    uuid supplier_id FK
    numeric unit_cost
    numeric packaging_cost
    numeric inbound_freight
    daterange valid_period
  }
  inventory { uuid id PK; uuid company_id FK; uuid variant_id FK; int on_hand; int reserved; int incoming }
  inventory_movements {
    uuid id PK
    uuid company_id FK
    uuid variant_id FK
    string type "IN/OUT/ADJUST/SALE/RETURN"
    int quantity
    string reason
    timestamptz created_at
  }
  suppliers { uuid id PK; uuid company_id FK; string name; string tax_id; int lead_time_days }
  customers { uuid id PK; uuid company_id FK; string external_id; string name_hash; string doc_hash }
  orders {
    uuid id PK
    uuid company_id FK
    uuid marketplace_account_id FK
    uuid customer_id FK
    string external_id
    string status
    numeric gross_amount
    numeric freight_amount
    numeric commission_amount
    timestamptz ordered_at
  }
  order_items {
    uuid id PK
    uuid company_id FK
    uuid order_id FK
    uuid variant_id FK
    int quantity
    numeric unit_price
    numeric item_commission
    numeric item_cost_snapshot
  }
```

## 3. ERD — Financeiro, Precificação, Inteligência e Plataforma

```mermaid
erDiagram
  orders ||--o{ financial_transactions : generates
  bank_accounts ||--o{ financial_transactions : moves
  bank_accounts ||--o{ cash_flow : feeds
  invoices ||--o{ invoice_items : contains
  products ||--o{ pricing_rules : priced_by
  products ||--o{ competitors : compared
  competitors ||--o{ competitor_prices : quotes
  competitors ||--o{ competitor_history : tracks
  companies ||--o{ ai_insights : generated
  companies ||--o{ notifications : receives
  companies ||--o{ tasks : owns
  companies ||--o{ events : emits
  companies ||--o{ webhooks : configures

  financial_transactions {
    uuid id PK
    uuid company_id FK
    uuid order_id FK "nullable"
    uuid bank_account_id FK "nullable"
    string type "REVENUE/COMMISSION/FREIGHT/TAX/COGS/EXPENSE"
    string direction "IN/OUT"
    numeric amount
    date competence_date
  }
  cash_flow { uuid id PK; uuid company_id FK; date day; numeric inflow; numeric outflow; numeric balance }
  bank_accounts { uuid id PK; uuid company_id FK; string name; numeric balance }
  invoices { uuid id PK; uuid company_id FK; string number; string type; numeric total; date issued_at }
  invoice_items { uuid id PK; uuid company_id FK; uuid invoice_id FK; string description; numeric amount }
  pricing_rules {
    uuid id PK
    uuid company_id FK
    uuid product_id FK
    numeric target_margin
    numeric min_price
    numeric ideal_price
    numeric break_even
  }
  competitors { uuid id PK; uuid company_id FK; uuid product_id FK; string external_id; string seller }
  competitor_prices { uuid id PK; uuid company_id FK; uuid competitor_id FK; numeric price; int position; timestamptz captured_at }
  competitor_history { uuid id PK; uuid company_id FK; uuid competitor_id FK; jsonb snapshot; timestamptz captured_at }
  ai_insights {
    uuid id PK
    uuid company_id FK
    string agent "FINANCE/INVENTORY/PURCHASING/PRICING/GROWTH/COMPETITION"
    string severity
    string title
    text body
    jsonb data
    string status
  }
  notifications { uuid id PK; uuid company_id FK; uuid user_id FK; string channel; string status; jsonb payload }
  tasks { uuid id PK; uuid company_id FK; string title; string status; uuid assignee_id }
  events { uuid id PK; uuid company_id FK; string name; jsonb payload; timestamptz occurred_at }
  jobs { uuid id PK; string queue; string status; jsonb data; int attempts; timestamptz created_at }
  webhooks { uuid id PK; uuid company_id FK; string url; string secret_enc; string[] topics; boolean active }
  system_settings { uuid id PK; string key UK; jsonb value }
```

## 4. Catálogo de tabelas (resumo)

| Tabela | Context | Papel |
|--------|---------|-------|
| `companies` | IAM | Tenant raiz. |
| `users` | IAM | Usuários (senha **ou** Google). |
| `roles`, `permissions`, `user_roles`, `role_permissions` | IAM | RBAC. |
| `subscriptions` | Billing | Plano e ciclo de cobrança. |
| `feature_flags` | Billing | Liberação de recursos por tenant/plano. |
| `audit_logs` | Audit | Trilha de auditoria (quem/o quê/diff). |
| `marketplaces` | Integração | Catálogo de marketplaces suportados. |
| `marketplace_accounts` | Integração | Conexão OAuth do tenant (tokens criptografados). |
| `webhooks` | Integração | Webhooks de entrada/saída. |
| `products`, `product_variants` | Catalog | Catálogo e variações. |
| `product_costs` | Catalog | Custo histórico por período (`daterange`). |
| `suppliers` | Catalog | Fornecedores e lead time. |
| `inventory`, `inventory_movements` | Inventory | Saldo e razão de movimentações. |
| `orders`, `order_items` | Sales | Pedidos e itens (com snapshot de custo/comissão). |
| `customers` | Sales | Clientes (PII com hash — LGPD). |
| `financial_transactions` | Finance | Razão financeiro (base da DRE). |
| `cash_flow`, `bank_accounts` | Finance | Fluxo de caixa e contas. |
| `invoices`, `invoice_items` | Finance | Notas/documentos. |
| `pricing_rules` | Pricing | Preço mínimo/ideal/break-even por produto. |
| `competitors`, `competitor_prices`, `competitor_history` | Competition | Monitoramento de concorrência. |
| `ai_insights` | AI | Saídas dos agentes. |
| `notifications` | Notifications | Alertas multicanal. |
| `tasks` | Platform | Tarefas/ações sugeridas. |
| `events` | Platform | Event store (auditoria de eventos de domínio). |
| `jobs` | Platform | Espelho persistente de jobs BullMQ (observabilidade). |
| `system_settings` | Platform | Configuração global. |

## 5. Índices e constraints (decisões-chave)

- **Idempotência de sync:** `UNIQUE (marketplace_account_id, external_id)` em `orders` e `products`.
- **Tenant em todo índice composto:** índices começam por `company_id` (ex.: `(company_id, ordered_at)` em `orders` para dashboards por período).
- **Custo vigente:** `EXCLUDE` constraint com `daterange` em `product_costs` impede sobreposição de períodos por produto.
- **Financeiro por competência:** index `(company_id, competence_date, type)` em `financial_transactions` (base da DRE).
- **Movimentações:** index `(company_id, variant_id, created_at)` para reconstruir saldo.
- **Concorrência temporal:** index `(competitor_id, captured_at desc)`.
- **Particionamento (escala):** `orders`, `order_items`, `financial_transactions`, `events` e
  `competitor_prices` são candidatos a **partição por range de tempo** (mensal) quando o volume
  exigir — previsto para suportar 10M+ pedidos. Decisão em [ADR-0004](adr/0004-particionamento-e-escala.md).
- **RLS:** policy `USING (company_id = current_setting('app.current_company')::uuid)` em todas as
  tabelas tenant-scoped.

## 6. Estratégia de migrations

- Fonte única: `prisma/schema.prisma`.
- `prisma migrate dev` em desenvolvimento; `prisma migrate deploy` em CI/CD.
- Migrations de RLS e partição (não cobertas nativamente pelo Prisma) entram como
  **migrations SQL customizadas** versionadas junto.
- Seed (`prisma/seed.ts`) cria: marketplaces, roles/permissions padrão, plano demo.

> O `schema.prisma` completo é entregue no **Sprint 1** junto da primeira migration executável.
> Aqui definimos o contrato do modelo; o arquivo Prisma é código e segue o roadmap.
