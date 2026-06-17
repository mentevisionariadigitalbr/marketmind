# Catalog Sync (Sprint 2.6)

Motor de sincronização de catálogo do Mercado Livre: produtos, variações,
estoque, preços, categorias, imagens e atributos — idempotente, event-driven e
escalável. Reaproveita a infra de filas do [Sprint 2.5](architecture-workers.md).

## Arquitetura

Clean Architecture / Hexagonal / DDD. Nenhuma regra de negócio depende do SDK:

```
Worker ──┐                        domain/ports
         │  use cases (application) ──────────────▶ MercadoLivreApi (porta)
         │  - SyncProductsUseCase                   CatalogSyncRepository (porta)
         │  - SyncVariationsUseCase                         ▲
         │  - SyncInventoryUseCase            adapters ─────┤
         │  - SyncPricesUseCase               - MercadoLivreApiFactoryAdapter (SDK + circuit breaker)
         │  - SyncCategoriesUseCase           - PrismaCatalogSyncRepository (idempotente)
         └─ mappers/ml-item.mapper.ts (cru ML → modelo normalizado)
```

## Fluxo de sincronização

```
Webhook ML ──▶ ml.webhook.process ──fan-out por tópico──▶
   orders*      → ml.order.fetch
   items*       → ml.variation.sync   (re-sync completo do anúncio)
   price*       → ml.price.sync
   stock/invent → ml.inventory.sync
   categor*     → ml.category.sync

Scheduler (cron */catalog) ──▶ ml.catalog.sync (kickoff, sem accountId)
   └─ fan-out por conta conectada ──▶ ml.catalog.sync { accountId, offset:0 }
        └─ SyncProductsUseCase (página) ──hasMore?──▶ re-despacha { offset:+20 }
             └─ por item: getItems (multiget) → mapMeliItem → upsertProduct
```

## Filas

| Fila | Responsável | Disparo |
|------|-------------|---------|
| `ml.catalog.sync` | produtos+variações+estoque+preços+imagens (paginado) | scheduler / kickoff |
| `ml.variation.sync` | re-sync de um anúncio (item) | webhook `items` |
| `ml.inventory.sync` | estoque/disponibilidade de um item | webhook `stock` |
| `ml.price.sync` | preço + histórico de um item | webhook `price` |
| `ml.category.sync` | categoria + árvore (closure) | webhook `categories` |

Todas com retry (imediato/30s/2m/10m/30m), DLQ (`<fila>.dlq`), métricas e mirror em `jobs`.

## Modelo de dados

`products` (header + preço/estoque corrente) · `product_variants` (SKU/cor/tamanho/
GTIN/atributos; item sem variação ⇒ variante sintética) · `inventory` (1:1 por
variante) · `product_prices` (histórico append-only) · `product_images` ·
`categories` + `category_tree` (closure, global).

Constraints de idempotência:
- `products UNIQUE(marketplace_account_id, external_id)`
- `product_variants UNIQUE(product_id, external_id)`
- `inventory UNIQUE(variant_id)`
- `product_images UNIQUE(product_id, external_id)`
- `categories UNIQUE(external_id)` · `category_tree UNIQUE(ancestor, child)`

## Idempotência (3 camadas)

1. **Banco** — unique keys acima ⇒ nunca duplica.
2. **Fila** — `jobId` determinístico (BullMQ deduplica o mesmo evento/página).
3. **Worker/Repo** — `upsertProduct` é upsert + **retry de conflito (P2002)**:
   sob concorrência os escritores convergem (provado: 30 syncs simultâneos ⇒ 1
   produto, 2 variações, sem deadlock).

Preços: o histórico só ganha linha quando o preço **muda** (re-sync do mesmo
preço = 0 linhas novas).

## Sincronização incremental vs completa

- **Incremental** — `products.last_synced_at` por produto + páginas a partir de um
  `offset`; o upsert idempotente torna re-sync barato.
- **Completa** — kickoff sem `accountId` faz fan-out por conta; cada página
  re-despacha a próxima via `hasMore`/`nextOffset` (backpressure natural,
  recupera inconsistências, executável manualmente via `ml.catalog.sync`).

## Resiliência

- **Circuit breaker** (`@marketmind/queue`) **plugado no SDK** (`HttpClient`):
  protege a API do ML contra cascata (CLOSED/OPEN/HALF_OPEN). _(Dívida do 2.5 resolvida.)_
- **Rate limit** — SDK respeita `Retry-After` + espaçamento mínimo.
- **DLQ + retry** por fila; reprocessamento idempotente.

## Observabilidade

Métricas (`/metrics`, Prometheus): `products_synced_total`, `inventory_updates_total`,
`price_updates_total`, `catalog_sync_duration_ms`, `category_sync_duration_ms`,
`catalog_sync_failures_total` + as métricas de job do 2.5. Logs estruturados JSON
com redaction de tokens.

## Escalabilidade (alvo: 10k produtos / 50k SKUs / 100k variações)

- **Paginação obrigatória** (20 itens/página via multiget) + re-dispatch ⇒
  jobs pequenos, backpressure.
- **Concorrência por fila** configurável; workers horizontais
  (`docker compose --profile full up --scale workers=N`).
- Filas independentes isolam picos (catálogo não trava pedidos).
- Próximo passo: particionar `product_prices` por tempo quando o histórico crescer.
