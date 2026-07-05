-- MarketMind AI — Dashboard performance: índices + materialized views (Sprint 3.2)
--
-- Dois grupos:
--  (A) Índices que aceleram as queries OPERACIONAIS do dashboard HOJE — ganho
--      imediato, sem mudança de comportamento nem de segurança (RLS intacto).
--  (B) Materialized Views (grão diário) prontas para refresh concorrente. MVs no
--      Postgres NÃO suportam RLS, portanto o adapter continua lendo as tabelas
--      operacionais (real-time, RLS-enforced). As MVs ficam disponíveis para
--      opt-in futuro COM filtro explícito de company_id. Ver docs/dashboard-api.md.

-- =========================================================================
-- (A) Índices de performance (operacional)
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_order_items_company_product ON order_items (company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_products_company_status     ON products (company_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_product           ON inventory (product_id);

-- =========================================================================
-- (B) Materialized Views (grão diário → agregáveis por período)
-- =========================================================================

-- Vendas por dia (overview / revenue / orders / timeline).
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_orders_daily AS
SELECT company_id,
       date_trunc('day', ordered_at)::date    AS day,
       SUM(gross_amount)::numeric(18,2)        AS revenue,
       COUNT(*)::int                           AS orders,
       SUM(commission_amount)::numeric(18,2)   AS commission,
       SUM(freight_amount)::numeric(18,2)      AS freight,
       COUNT(DISTINCT customer_id)::int        AS distinct_customers
FROM orders
GROUP BY company_id, date_trunc('day', ordered_at)::date
WITH DATA;
CREATE UNIQUE INDEX IF NOT EXISTS mv_orders_daily_pk ON mv_orders_daily (company_id, day);

-- Unidades vendidas por dia (timeline).
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_order_items_daily AS
SELECT oi.company_id,
       date_trunc('day', o.ordered_at)::date AS day,
       SUM(oi.quantity)::int                 AS units_sold
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
GROUP BY oi.company_id, date_trunc('day', o.ordered_at)::date
WITH DATA;
CREATE UNIQUE INDEX IF NOT EXISTS mv_order_items_daily_pk ON mv_order_items_daily (company_id, day);

-- Receita por produto por dia (products / abc / top-products / categories).
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_daily AS
SELECT oi.company_id,
       oi.product_id,
       date_trunc('day', o.ordered_at)::date         AS day,
       SUM(oi.quantity * oi.unit_price)::numeric(18,2) AS revenue,
       SUM(oi.quantity)::int                          AS units_sold
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE oi.product_id IS NOT NULL
GROUP BY oi.company_id, oi.product_id, date_trunc('day', o.ordered_at)::date
WITH DATA;
CREATE UNIQUE INDEX IF NOT EXISTS mv_product_daily_pk ON mv_product_daily (company_id, product_id, day);

-- Snapshot de estoque por empresa (inventory / overview).
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory_snapshot AS
WITH stock AS (
  SELECT p.company_id, p.id, p.status, COALESCE(p.price, 0) AS price,
         COALESCE(SUM(i.available), 0)::int AS on_hand
  FROM products p
  LEFT JOIN inventory i ON i.product_id = p.id
  GROUP BY p.company_id, p.id, p.status, p.price
)
SELECT company_id,
       COUNT(*) FILTER (WHERE status = 'active')::int                              AS active_products,
       COUNT(*) FILTER (WHERE on_hand = 0)::int                                    AS without_stock,
       COUNT(*) FILTER (WHERE status = 'active' AND on_hand > 0 AND on_hand <= 5)::int AS critical_stock,
       COALESCE(SUM(on_hand), 0)::int                                              AS total_units,
       COALESCE(SUM(on_hand * price), 0)::numeric(18,2)                            AS value_at_price
FROM stock
GROUP BY company_id
WITH DATA;
CREATE UNIQUE INDEX IF NOT EXISTS mv_inventory_snapshot_pk ON mv_inventory_snapshot (company_id);

-- Acesso de leitura para a role de runtime (MVs não têm RLS — o consumidor DEVE
-- filtrar por company_id explicitamente).
GRANT SELECT ON mv_orders_daily, mv_order_items_daily, mv_product_daily, mv_inventory_snapshot TO marketmind_app;

-- =========================================================================
-- Refresh CONCORRENTE — executar como statements individuais (um refresh
-- CONCURRENTLY não pode rodar dentro de bloco de transação/função). O worker
-- agendado (Sprint 3.3) emite, em sequência e fora de transação:
--
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_orders_daily;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_items_daily;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_daily;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_snapshot;
--
-- Os índices únicos acima habilitam o modo CONCURRENTLY (sem lock de leitura).
-- =========================================================================
