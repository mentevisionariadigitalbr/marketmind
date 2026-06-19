# Dashboard — Contratos REST & Performance (Sprint 3.0, FASES 4 e 5)

**Design only.** Endpoints, shapes e estratégia de performance documentados —
nada implementado. Os tipos de resposta vivem em
`@marketmind/dashboard-core` (`src/dto.ts`); a implementação Nest entra na 3.1.

## Convenções
- Prefixo: `/api/v1/dashboard`.
- **Auth**: JWT (guard existente) + `@RequirePermissions('dashboard:read')`.
- **Tenant**: `company_id` do `TenantContext` (RLS). Nunca aceito do cliente.
- **Auditoria**: `@AuditAction('dashboard.read')` (interceptor existente).
- **Swagger** (obrigatório): cada endpoint com `@ApiTags('Dashboard')`,
  `@ApiOkResponse({ type: <Dto> })`, `@ApiQuery` para filtros.
- **Query params comuns**: `from`, `to` (ISO; default = mês corrente),
  `granularity` (`day|week|month|quarter|year`), `marketplaceAccountId?`,
  `categoryId?`, `limit?`.
- **Erros**: envelope padrão da API (`ApplicationError` → HTTP). `401/403`
  (auth/permissão), `422` (período inválido), `503` (MV em refresh / stale).

## Endpoints (11)

| Método | Rota | Resposta (DTO) | Observação |
|--------|------|----------------|------------|
| GET | `/dashboard/overview` | `OverviewDTO` | KPIs do período + tendências |
| GET | `/dashboard/revenue` | `RevenueDTO` | receita, ticket, margem contrib., growth |
| GET | `/dashboard/orders` | `RevenueDTO` (orders/ticket) | volume e ticket |
| GET | `/dashboard/products` | `TopProductDTO[]` | catálogo/ativos/sem estoque |
| GET | `/dashboard/inventory` | `InventoryDTO` | valor, giro, cobertura |
| GET | `/dashboard/categories` | `CategoryDTO[]` | receita por categoria |
| GET | `/dashboard/abc` | `AbcDTO` | curva 80/15/5 |
| GET | `/dashboard/top-products` | `TopProductDTO[]` | ranking (`limit`) |
| GET | `/dashboard/kpis` | `KpiValue[]` | lista plana de KPIs (catálogo) |
| GET | `/dashboard/timeline` | `TimelinePointDTO[]` | série temporal (`granularity`) |
| GET | `/dashboard/health` | `DashboardHealthDTO` | frescor das MVs / cache |

> KPIs `needs-table` (margem/lucro bruto/líquido, valor a custo) retornam com
> `availability` no catálogo e **value 0 + flag** até existirem `product_costs`/
> `financial_transactions`. Nunca número errado silencioso.

## Fluxo de uma requisição

```
HTTP → JwtGuard → PermissionGuard('dashboard:read') → AuditInterceptor
  → DashboardController → DashboardQueryService (use case)
    → CachePort (Redis)  ── hit ──> DTO
                          └ miss ─> DashboardQueryPort (MV/fact) → calculators
                                    (dashboard-core) → DTO → cache set (TTL)
```

A camada de cálculo é `@marketmind/dashboard-core` (puro). O service só orquestra
porta de dados + cache; nenhuma fórmula vive no Nest.

## Performance (FASE 5) — meta: dashboard < 2s

### 1. Materialized Views (leitura O(1) sobre agregados)
| MV | Grão | Alimenta |
|----|------|----------|
| `mv_daily_sales` | company×dia | revenue/orders/timeline/growth |
| `mv_product_revenue` | company×produto×período | ABC, top-products |
| `mv_category_revenue` | company×categoria×período | categories |
| `mv_inventory_snapshot` | company×dia | inventory/coverage/turnover |

Índices: `(company_id, bucket_date)` em todas; `REFRESH ... CONCURRENTLY`
(exige índice único) para não bloquear leitura.

### 2. Agregação incremental
Refresh disparado por evento de domínio (`OrderImported`, `CatalogUpdated`,
`PriceChanged`) com **debounce** no worker — evita refresh por pedido. Janela
máxima de atraso aceitável documentada por MV (ex.: vendas ≤ 5 min).

### 3. Snapshot tables
`fact_inventory` (snapshot diário) preserva histórico para séries e giro —
estoque é estado mutável; sem snapshot não há "valor de estoque em D-30".

### 4. Caching (Redis)
- Chave: `dash:{companyId}:{endpoint}:{hash(filtros)}`.
- TTL por endpoint: overview/kpis 60s; timeline/abc 300s; health 15s.
- **Stale-while-revalidate**: serve cache vencido e dispara refresh em background.
- Invalidação por evento (`del dash:{companyId}:*`) ao importar pedidos.

### 5. Background refresh
Worker agendado (BullMQ repeatable) faz `REFRESH MATERIALIZED VIEW CONCURRENTLY`
em janela + on-demand pós-ingestão. `/dashboard/health` expõe `lastRefreshAt`
e `status: ok|degraded|stale`.

### 6. Orçamento de latência (alvo < 2s p95)
`cache hit` < 50ms · `MV query` < 300ms · `cálculo (dashboard-core)` < 20ms ·
serialização < 30ms. Sem MV (fallback nas tabelas operacionais) a meta cai —
por isso MV é pré-requisito, não otimização posterior.
