# Modelo Analítico (Sprint 3.0, FASE 2)

Camada analítica **separada** da operacional (estilo Amazon Seller Central /
Shopify Analytics / Power BI / Looker): star schema read-optimized, alimentado a
partir das tabelas operacionais — sem acoplar ao write-path de sync.

## Princípios
- **Operacional ≠ Analítico**: o sync escreve em `orders/products/...`; a camada
  analítica (fact/dim) é derivada e otimizada para leitura/agregação.
- **Tenant em tudo**: toda fact/dim tem `company_id` + RLS.
- **Materialização**: views materializadas + snapshots; refresh incremental por
  evento (`OrderImported`/`CatalogUpdated`) e agendado.
- **Grão explícito** por fato; chaves surrogate para dims.

## Dimensões

| Dim | Grão | Origem | Atributos |
|-----|------|--------|-----------|
| `dim_dates` | 1 linha/dia | gerada | date, day, week, month, quarter, year, dow, is_weekend |
| `dim_products` | produto | `products` (+variants) | sku, title, status, category_key, account_key |
| `dim_categories` | categoria | `categories`/`category_tree` | name, parent, path, level |
| `dim_marketplaces` | marketplace | `marketplaces` | code, name |
| `dim_accounts` | conta | `marketplace_accounts` | marketplace_key, nickname, status |
| `dim_customers` | cliente | `customers` | external_id, nickname (PII com hash — LGPD) |

## Fatos

| Fato | Grão | Medidas | Origem |
|------|------|---------|--------|
| `fact_orders` | 1 pedido | gross, freight, commission, contribution | `orders` |
| `fact_order_items` | 1 item de pedido | qty, unit_price, item_commission, revenue, cogs* | `order_items` (+`product_costs`) |
| `fact_inventory` | snapshot diário/variante | on_hand, reserved, value_price, value_cost* | `inventory`+`product_prices`(+`product_costs`) |
| `fact_prices` | mudança de preço | amount, delta | `product_prices` |
| `fact_product_costs`* | custo vigente/produto | unit_cost, packaging, inbound_freight | **`product_costs` (nova)** |
| `fact_finance`* | transação | amount, type, direction, competence_date | **`financial_transactions` (nova)** |

\* dependem das tabelas financeiras ausentes (ver [dashboard-architecture](dashboard-architecture.md)).

## Diagrama (star)

```
            dim_dates ─┐        ┌─ dim_products ─ dim_categories
                       │        │
   dim_accounts ─ fact_orders ─ fact_order_items ─ dim_customers
                       │                 │
                       │           fact_product_costs*
   dim_marketplaces ───┘
            fact_inventory ─ dim_products      fact_prices ─ dim_products
            fact_finance* ─ dim_dates
```

## Estratégia de materialização (resumo; detalhe em dashboard-api.md)
- **MV** `mv_daily_sales` (company, date, revenue, orders, units, contribution),
  `mv_product_revenue` (ABC), `mv_inventory_snapshot`.
- **Refresh incremental** por evento de domínio + `REFRESH MATERIALIZED VIEW
  CONCURRENTLY` agendado (worker) — janela noturna + on-demand.
- **Snapshot diário** de estoque (`fact_inventory`) para séries históricas.

## Migração proposta (Sprint 3.1+, NÃO agora)
1. `dim_dates` (seed) + `dim_*` como views sobre as operacionais.
2. MVs de vendas/receita/ABC/estoque.
3. `product_costs` + `financial_transactions` (Sprint Finance) habilitam
   `fact_order_items.cogs`, `fact_finance`, margens/lucro reais.
