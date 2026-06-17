# Arquitetura Event-Driven & Workers (Sprint 2.5)

Evolução para processamento assíncrono baseado em eventos. A API responde
imediatamente; todo trabalho pesado roda em **workers** consumindo filas BullMQ.
Decisões em [ADR-0003](adr/0003-event-driven-bullmq.md).

## Fluxo ponta a ponta

```
Mercado Livre ──webhook──▶ API (NestJS)
                              │  1. grava webhook_events (outbox, idempotente)
                              │  2. dispatch ml.webhook.process  (ACK < 300ms)
                              ▼
                           Redis (BullMQ)
                              ▼
                    Worker: ml.webhook.process
                              │  resolve tópico → fan-out
                 ┌────────────┴─────────────┐
                 ▼                           ▼
        ml.order.fetch               ml.catalog.sync
        (SyncOrdersUseCase)          (catálogo — próxima fatia)
                 │                           │
                 ▼                           ▼
            PostgreSQL (upsert idempotente por external_id) + RLS

  ml.account.refresh ◀── scheduler (cron */30) ── renova tokens proativamente
```

Princípio: **nenhum webhook executa sync diretamente**. O webhook só persiste o
evento (outbox) e enfileira — a API nunca bloqueia em chamadas ao ML.

## Componentes

| Camada | Onde | Papel |
|--------|------|-------|
| Abstração de fila | `packages/queue` | Ports `JobDispatcher`/`QueueProvider`/`JobHandler`; domínio não conhece o broker |
| Adapter BullMQ | `packages/queue/src/bullmq` | Implementação runtime (retry/backoff/DLQ) |
| Adapter em memória | `packages/queue/src/in-memory` | Test double determinístico |
| Produtor | `apps/api` (`QueueModule`) | Despacha jobs; outbox-first |
| Consumidor | `apps/workers` | Processors + schedulers + health + métricas |
| Observabilidade | tabela `jobs` + `/metrics` | Espelho de estado + Prometheus |

**Troca de broker:** RabbitMQ/Kafka/SQS/PubSub = novo adapter de `QueueProvider`
+ `JobDispatcher`, sem tocar em regra de negócio.

## Filas

- `ml.webhook.process` — resolve a notificação e despacha o job adequado (fan-out).
- `ml.order.fetch` — busca/sincroniza pedidos da conta (idempotente).
- `ml.catalog.sync` — produtos/categorias/estoque/variações (stub nesta fatia).
- `ml.account.refresh` — renova token + health check da conta.

Cada fila tem sua DLQ: `<fila>.dlq`.

## Retry & DLQ

Política (`packages/queue/src/retry.ts`):

| Tentativa | Atraso |
|-----------|--------|
| 1 | imediata |
| 2 | 30s |
| 3 | 2min |
| 4 | 10min |
| 5 | 30min |

Após a 5ª falha → **DLQ** (`onDeadLetter` → métrica `jobs_dlq_total` + status
`dead_letter` em `jobs`). Backoff exponencial custom no Worker BullMQ.

## Idempotência (múltiplas camadas)

1. **Banco** — `webhook_events.dedupe_key` único; `UNIQUE(marketplace_account_id, external_id)` em `orders`.
2. **Fila** — `jobId` determinístico (BullMQ deduplica) — o mesmo webhook 100×
   gera 1 job.
3. **Worker** — upsert idempotente (`PrismaOrderSyncRepository`).

## Observabilidade

- **Tabela `jobs`** (centro de observabilidade): `queue`, `job_name`, `job_id`,
  `status` (pending|processing|completed|failed|dead_letter), `attempts`,
  `started_at`, `finished_at`, `duration_ms`, `payload`, `error`.
- **Logs estruturados** (JSON) com **redaction automática** de tokens/segredos
  (`access_token`, `refresh_token`, `client_secret`, `Bearer …`).
- **Métricas** (`/metrics`, Prometheus): `jobs_processed_total`, `jobs_failed_total`,
  `jobs_retried_total`, `jobs_dlq_total`, `jobs_processing_time_ms`.
- **Health**: `/liveness`, `/readiness` (PG + Redis), `/health`.

## Resiliência

- **Circuit breaker** (`CircuitBreaker`) para a API do ML — CLOSED/OPEN/HALF_OPEN.
- **Rate limit** — o SDK respeita `Retry-After` + espaçamento mínimo.
- **Outbox** — evento persiste antes do enqueue; se o Redis cair, a reconciliação
  reenfileira a partir de `webhook_events`.
- **Refresh proativo** de token (scheduler) evita falhas por expiração.

## Escalabilidade

- Workers são **stateless** e horizontais: `docker compose --profile full up
  --scale workers=N`. BullMQ distribui os jobs.
- Concorrência por fila configurável (`webhook.process`=10, `order.fetch`=5, …).
- Filas independentes isolam picos (um surto de pedidos não trava o refresh).
- Caminho para 100k tenants / 10M pedidos: particionamento de `orders` (ADR-0004)
  + mais réplicas de worker.

## Execução local

```bash
pnpm db:up                                   # postgres + redis
pnpm --filter @marketmind/api exec prisma migrate deploy
docker compose -f infra/docker-compose.yml --profile full up   # api(local) + workers + scheduler
# ou, em dev, rodar o worker direto:
pnpm --filter @marketmind/workers start
```
