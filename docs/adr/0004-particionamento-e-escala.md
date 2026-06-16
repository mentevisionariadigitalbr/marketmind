# ADR-0004 — Particionamento por tempo para escala

**Status:** Aceito · **Data:** 2026-06-15

## Contexto

Metas de escala: 10M+ pedidos, 1M+ SKUs, múltiplos marketplaces. Tabelas de maior crescimento
(`orders`, `order_items`, `financial_transactions`, `events`, `competitor_prices`) degradariam
consultas e manutenção (vacuum/index bloat) se mantidas monolíticas.

## Decisão

Adotar **particionamento declarativo do PostgreSQL por range de tempo** (mensal) nessas tabelas,
introduzido **quando o volume justificar** (não prematuramente). Índices sempre prefixados por
`company_id`. Dados frios podem ser movidos para storage mais barato / detach de partições antigas.
As partições e suas constraints são gerenciadas por migrations SQL customizadas (fora do escopo
nativo do Prisma) e automação de criação de partições futuras.

## Alternativas consideradas

- **Tabela única + só índices:** simples, mas manutenção e queries degradam no volume-alvo.
- **Sharding por tenant em múltiplos bancos:** complexidade operacional alta; adiado até necessidade real.
- **Mover histórico para data warehouse desde o início:** útil para BI, mas não resolve o OLTP quente.

## Consequências

- (+) Consultas por período (dashboards, DRE) varrem menos dados (partition pruning).
- (+) Manutenção e expurgo por detach de partição são baratos.
- (−) Prisma não gerencia partições nativamente → migrations SQL e automação próprias.
- (−) Chaves únicas precisam incluir a coluna de partição (impacta design de constraints).
