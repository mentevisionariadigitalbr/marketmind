# Deploy / Homologação (Sprint 3.2)

Topologia gerenciada: **Frontend → Vercel · Backend/Workers → Railway ·
Postgres → Supabase · Redis → Upstash**. Sem segredos no repositório — use os
`.env.example` como referência e configure as variáveis em cada plataforma.

```
[Vercel: Next.js]  --HTTPS-->  [Railway: NestJS API]  --->  [Supabase: Postgres]
                                      |                       (RLS, migrations)
                                      +----------------->  [Upstash: Redis]  <--- [Railway: Workers]
```

## 1. Supabase (Postgres)
1. Crie um projeto; copie a **Connection string** (Pooler ou direta) com `sslmode=require`.
2. Defina `DATABASE_URL` (migrations) e `APP_DATABASE_URL` (runtime) — podem ser a
   mesma URL em produção gerenciada.
3. Aplique o schema + RLS + MVs:
   ```bash
   pnpm --filter @marketmind/api exec prisma migrate deploy
   ```
   > Isto cria tabelas, políticas RLS, a role `marketmind_app`, índices de
   > performance e as materialized views do dashboard (Sprint 3.2).
4. (Opcional) Seed inicial: `pnpm --filter @marketmind/api db:seed`.

## 2. Upstash (Redis)
1. Crie um banco Redis; copie a URL **`rediss://`** (TLS).
2. Defina `REDIS_URL` na API e nos Workers. Habilita o cache do dashboard
   (senão cai no cache em memória) e as filas BullMQ.

## 3. Railway (API + Workers)
Dois serviços a partir do mesmo repo (monorepo pnpm):

**API**
```
Build:  pnpm install --frozen-lockfile && pnpm --filter @marketmind/api build
Start:  node apps/api/dist/src/main.js
```
**Workers** (executa via ts-node; `build` é typecheck-only)
```
Build:  pnpm install --frozen-lockfile && pnpm --filter @marketmind/workers typecheck
Start:  pnpm --filter @marketmind/workers start   # ts-node src/main.ts
```
Variáveis (ver `apps/api/.env.example`): `NODE_ENV, DATABASE_URL, APP_DATABASE_URL,
REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, TOKEN_ENCRYPTION_KEY,
CORS_ORIGIN, THROTTLE_TTL_MS, THROTTLE_LIMIT, METRICS_TOKEN, ML_*`.

Healthcheck: `GET /health`. Swagger: `GET /docs`.

## 4. Vercel (Web)
- Root: `apps/web`; framework Next.js (detecção automática).
- Build: `pnpm install && pnpm --filter @marketmind/web build` (ou padrão Vercel).
- Variável: `NEXT_PUBLIC_API_URL = https://SEU-BACK.up.railway.app`.
- Ajuste `CORS_ORIGIN` na API para o domínio da Vercel.

## 5. Segurança em produção (Sprint 3.2)
- **Helmet** ativo (CSP/HSTS/X-Frame-Options/X-Content-Type-Options/Referrer-Policy).
- **Rate limiting**: global 300/min por IP; `auth` 20/min; `dashboard` 120/min; ML 60/min;
  webhook isento. Tune via `THROTTLE_*`.
- **/metrics** restrito: libera loopback/rede interna; de fora, exige
  `Authorization: Bearer $METRICS_TOKEN`. Configure o scrape do Prometheus com esse header.
- Gere segredos com `openssl rand -hex 32`. Rotacione `TOKEN_ENCRYPTION_KEY` com cuidado
  (recriptografa tokens de marketplace).

## 6. Refresh das materialized views
As MVs (`mv_orders_daily`, `mv_order_items_daily`, `mv_product_daily`,
`mv_inventory_snapshot`) aceleram leituras analíticas. Atualize-as periodicamente
(cron/worker), **fora de transação**, em sequência:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_orders_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_items_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_snapshot;
```
> Hoje o adapter lê as tabelas operacionais (real-time, RLS-enforced). As MVs
> ficam prontas para opt-in com filtro explícito de `company_id` (MV não tem RLS).

## 7. Smoke test pós-deploy
```bash
curl -fsS https://SEU-BACK.up.railway.app/health        # {"status":"ok",...}
curl -fsS https://SEU-BACK.up.railway.app/ready          # {"db":"up"}
curl -o /dev/null -w "%{http_code}\n" .../dashboard/overview   # 401 sem token (esperado)
```
