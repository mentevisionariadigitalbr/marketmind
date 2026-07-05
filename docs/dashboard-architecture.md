# Dashboard Executivo — Arquitetura (Sprint 3.0, FASE 1)

Análise estrutural fundamentada no schema atual. **Nada implementado** — projeto.

## Fontes de dados existentes (verificadas no schema/banco)

| Domínio | Tabela | Campos-chave para o dashboard |
|---------|--------|-------------------------------|
| Pedidos | `orders` | `gross_amount`, `freight_amount`, `commission_amount`, `currency`, `status`, `ordered_at`, `customer_id`, `marketplace_account_id` (índice `(company_id, ordered_at)`) |
| Itens | `order_items` | `quantity`, `unit_price`, `item_commission`, `product_id`, `order_id` |
| Produtos | `products` | `title`, `status`, `price`, `available_quantity`, `category_id`, `last_synced_at` |
| Variações | `product_variants` | `sku`, `price`, `available_quantity`, `gtin`, atributos |
| Estoque | `inventory` | `available`, `reserved` (1:1 por variante) |
| Preços | `product_prices` | histórico (`amount`, `captured_at`) |
| Categorias | `categories` / `category_tree` | árvore (closure) |
| Clientes | `customers` | `external_id`, `nickname` |
| Contas | `marketplace_accounts` | `marketplace_id`, `status`, `external_user_id` |

**Multi-tenant:** todas tenant-scoped têm `company_id` + **RLS** (`app_current_company()`), exceto catálogo global (`marketplaces`, `categories`).

## Tabelas AUSENTES (impactam KPIs financeiros)

`product_costs` · `financial_transactions` · `cash_flow` · `invoices`/`expenses` — **não existem**. Sem elas não há COGS, lucro líquido real nem fluxo de caixa.

## Inventário de métricas — disponível hoje vs. requer novas tabelas

### ✅ Calculáveis HOJE (somente dados existentes)
| KPI | Fonte | Fórmula |
|-----|-------|---------|
| RevenueToday/Month/Year | `orders.gross_amount` por `ordered_at` | Σ gross_amount |
| OrdersToday/Month/Year | `orders` count | count |
| AverageTicket | orders | revenue / orders |
| GrowthRate | orders (períodos) | (atual−anterior)/anterior |
| SalesVelocity | `order_items.quantity` / tempo | Σ qty / dias |
| Timeline | orders por dia | série temporal |
| ActiveProducts | `products.status='active'` | count |
| ProductsWithoutStock | `inventory.available=0` | count |
| InventoryValue (a preço) | `inventory.available × variant.price` | Σ |
| InventoryTurnover (unidades) | unidades vendidas / estoque médio | ratio |
| StockCoverageDays | `available` / venda diária média | ratio |
| ABCClassification | receita por produto (order_items) | curva 80/15/5 |
| TopProducts / TopCategories | order_items + products.category_id | ranking |
| CustomerLTV / AOV / Frequency | `orders.customer_id` + customers | agregação |
| **ContributionMargin** | revenue − commission − freight (já em `orders`) | ✅ |

### 🟡 Exigem NOVA TABELA
| KPI | Tabela necessária |
|-----|-------------------|
| GrossMargin / GrossProfit | **`product_costs`** (COGS por produto/período — `daterange`) |
| NetMargin / NetProfit | `product_costs` + `financial_transactions` (despesas/impostos) |
| InventoryValue (a custo) | `product_costs` |
| CashFlow | `financial_transactions` + `cash_flow` |
| InventoryTurnover (COGS) | `product_costs` |

### 🔴 Exigem NOVA INTEGRAÇÃO/CONFIG
- **Impostos** — alíquota por regime (Simples Nacional configurável por tenant) → tabela de config + calculadora (Sprint Finance).
- **Despesas operacionais** — entrada manual / OFX → `financial_transactions`.

## Multi-tenant & Segurança (validação)
- **RLS** já garante isolamento; a **camada analítica DEVE** carregar `company_id` + RLS idênticos.
- **RBAC** existente: `OWNER`/`ADMIN`/`MEMBER` + permissão **`dashboard:read`** já no catálogo. Faltam papéis `MANAGER`/`ANALYST`/`VIEWER` (adicionar como system roles — só leitura).
- **Auditoria** (`audit_logs`) + interceptor já existem; acesso ao dashboard será auditável via `@AuditAction` + `@RequirePermissions('dashboard:read')`.
- **Rate limiting**: ainda não implementado (Helmet/throttler) → risco listado p/ 3.1.

## Decisão arquitetural
1. **Separar operacional de analítico**: views/fact tables read-optimized (ver [analytics-model](analytics-model.md)), sem acoplar ao write-path de sync.
2. **Domínio puro** dos KPIs em `packages/dashboard-core` (sem Prisma/Nest/React).
3. **Performance**: materialized views + snapshot + cache Redis (ver [dashboard-api](dashboard-api.md)).
4. **Sequenciar**: finanças (`product_costs`/`financial_transactions`) é pré-requisito dos KPIs de lucro → Sprint Finance antes/junto do 3.1 para os KPIs 🟡.
