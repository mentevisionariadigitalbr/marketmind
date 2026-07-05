# Auditoria da Integração Mercado Livre (Sprint 4.0 — diagnóstico)

**Somente diagnóstico — nada implementado.** Classificação de cada fluxo:
✅ Completo · 🟡 Parcial · 🔴 Ausente.

## Mapa da integração
- **SDK** (`packages/sdk-mercadolivre`): oauth, http-client, resources (orders, items, categories, users, questions).
- **Domínio/Aplicação** (`packages/integration-core`): ports `mercado-livre`, `MercadoLivreSession` (refresh), use cases de OAuth/sync/webhook, repos Prisma, crypto de tokens (AES-256-GCM).
- **API** (`apps/api`): `IntegrationController` (authorize, callback, sync/orders, webhook).
- **Workers** (`apps/workers`): processors order-fetch, catalog/category/item/variation/price/inventory-sync, account-refresh, webhook-process (fan-out).

## Classificação por fluxo

| Fluxo | Status | Evidência | Lacuna |
|---|---|---|---|
| **OAuth** | ✅ Completo | `get-ml-auth-url` + `connect-mercado-livre` + `oauth-state.service` (state assinado → CSRF) + `ml-oauth.adapter`. Teste: `connect…spec`. | — |
| **Refresh Token** | ✅ Completo | `MercadoLivreSession.apiForAccount` renova com skew de 60s, re-cifra e persiste; `account-refresh.processor` (proativo). | Sem teste **unitário** dedicado do refresh (coberto indiretamente). |
| **Pedidos** | ✅ Completo | `sync-orders` (spec) + `order-fetch.processor`; webhook `orders→ORDER_FETCH`; idempotência (`integration-ingestion`, `catalog-idempotency` int). | — |
| **Produtos** | ✅ Completo | `sync-products` (spec) + `sync-item` (spec) + `item-sync.processor`. | — |
| **Catálogo (categorias)** | ✅ Completo | `sync-categories` (spec) + `category-sync.processor`; webhook `categor→CATEGORY_SYNC`. | — |
| **Webhooks** | ✅ Completo | Outbox idempotente (`dedupeKey`) + ACK rápido + fan-out p/ 5 tópicos; `queue-roundtrip` int. | Reconciliação de outbox (eventos persistidos mas não enfileirados) ainda manual. |
| **Estoque** | 🟡 Parcial | `sync-inventory.use-case` real (getItem → updateVariantStockAndPrice) + `INVENTORY_SYNC` + webhook `stock/inventory`. | **Sem teste** unitário; sem reconciliação periódica de saldo. |
| **Variações** | 🟡 Parcial | `sync-variations.use-case` + `VARIATION_SYNC`. | Sem teste unitário dedicado. |
| **Preços** | 🟡 Parcial | `sync-prices.use-case` + `PRICE_SYNC` + histórico `product_prices`. | Sem teste unitário dedicado. |
| **Q&A pós-venda** | 🔴 Ausente | SDK tem `questions.ts`, mas nenhum use case/fluxo consome. | Capacidade do SDK sem fluxo de negócio. |
| **Envios / Shipping** | 🔴 Ausente | — | Sem rastreio/etiqueta/logística. |
| **Mensageria pós-venda** | 🔴 Ausente | — | — |

## Resumo executivo
- **Núcleo sólido**: OAuth, Refresh, Pedidos, Produtos, Categorias e Webhooks estão **Completos** e testados, com idempotência e tokens cifrados em repouso.
- **Riscos/lacunas (não bloqueantes)**:
  1. Estoque/Variações/Preços implementados mas **sem testes unitários** → risco de regressão silenciosa.
  2. **Reconciliação** ausente: webhooks são best-effort; sem job que re-sincronize periodicamente (defesa contra notificação perdida).
  3. `questions.ts` no SDK é capacidade **não usada** (candidata a remover por YAGNI, ou virar fluxo se houver necessidade real).
- **Não recomendado agora** (YAGNI): Shipping/Q&A/mensageria — só implementar com necessidade de negócio comprovada.

## Próximos passos sugeridos (quando priorizado — não nesta sprint)
1. Testes unitários para `sync-inventory`/`sync-variations`/`sync-prices` (fechar a lacuna de regressão — barato, alto valor).
2. Job de **reconciliação** (re-sync periódico de pedidos/estoque por conta) — robustez contra webhook perdido.
3. Decidir sobre `questions.ts`: remover (YAGNI) ou promover a fluxo.
