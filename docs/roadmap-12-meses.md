# Roadmap Técnico — 12 meses (a partir de jun/2026)

Princípio: **simplicidade e manutenção de longo prazo**. Nada entra sem objetivo
claro + testes + docs + monitoramento. YAGNI sobre tudo: o que não tiver
necessidade comprovada fica fora.

Horizontes: **H1 = 0–3 meses · H2 = 3–6 · H3 = 6–12.** Cada item tem um "porquê".

## Plataforma
- **H1** — Fechar lacunas de teste (estoque/variações/preços); remover `questions.ts` se sem uso (YAGNI). *Por quê: zerar regressão silenciosa, menos código.*
- **H2** — Papéis `MANAGER/ANALYST/VIEWER` como system roles read-only (migração + seed). *Por quê: clientes maiores pedem perfis de acesso.*
- **H3** — Reconciliação de outbox + job de re-sync periódico. *Por quê: robustez contra webhook perdido.*

## Integrações
- **H1** — Testes de `sync-inventory/variations/prices` (audit ML). *Barato, alto valor.*
- **H2** — 2º marketplace via `MarketplaceRegistry` (ex.: Shopee) **sem tocar no núcleo** — provar a abstração Open/Closed. *Só se houver demanda real.*
- **H3** — Camada de reconciliação genérica multi-marketplace.

## Financeiro (desbloqueia KPIs de lucro)
- **H1** — `product_costs` (COGS por produto/período, `daterange`) + entrada manual. *Por quê: desbloqueia margem/lucro bruto — maior gap do dashboard.*
- **H2** — `financial_transactions` (despesas/impostos) + config de regime (Simples). *Desbloqueia lucro líquido, DRE.*
- **H3** — Fluxo de caixa + conciliação. *Visão financeira completa.*

## IA
- **H2** — Camada de insights sobre os KPIs **já existentes** (resumo executivo, anomalias) — usar Claude com contratos tipados, sem reescrever domínio. *Por quê: valor sobre dados que já temos; baixo acoplamento.*
- **H3** — Recomendações de preço/reposição (depende de `product_costs`).

## Escalabilidade
- **H1** — ✅ *(feito 4.0)* Throttler em Redis. Próximo: **conectar Materialized Views** ao adapter com filtro explícito de `company_id` (MVs já existem). *Por quê: leitura O(1), <300ms sob volume.*
- **H2** — Worker de refresh das MVs (BullMQ repeatable) + métricas de frescor. *Por quê: dados analíticos sem custo de leitura.*
- **H3** — Particionamento de `orders/order_items` por período se o volume exigir (medir antes — YAGNI até dados justificarem).

## Mobile
- **H3** — **Avaliar** PWA do dashboard (responsivo já existe) antes de app nativo. *Por quê: menor custo/manutenção; só ir a nativo com necessidade comprovada (push, offline).* Decisão guiada por uso real, não suposição.

## Princípios transversais (todo horizonte)
- Contratos de API estáveis e versionados; nunca quebrar.
- Cada feature nova: objetivo + testes + docs + observabilidade — ou não entra.
- Preferir **subtração**: revisar dívida a cada sprint (como a limpeza da 4.0).
- Medir antes de otimizar; não construir para volume hipotético.
