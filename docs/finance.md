# Módulo Financeiro — Custos, Despesas, Impostos & DRE

Visão do "CFO inteligente": do custo do produto ao **lucro líquido real** por período.

## Separação de responsabilidades
- **Escrita** (`apps/api/src/modules/finance`): cadastra custos, despesas e alíquotas.
  - `/costs/*` — custo por produto/variante com vigência (Fase 1).
  - `/finance/expenses` — despesas operacionais (fixas/variáveis, recorrência).
  - `/finance/tax-rules` — alíquota efetiva por regime/categoria.
- **Leitura analítica** (`dashboard`): consome os agregados via `DashboardQueryPort`
  (`getCogs`, `getOperatingExpenses`, `getTaxes`) e monta o DRE.
  - `/finance/dre` — Demonstrativo de Resultado (no módulo finance, lê a porta do dashboard).
- **Cálculo puro** (`packages/dashboard-core`): `costs.ts`, `expenses.ts`, `tax.ts`,
  `dre.ts`, `calculators.ts` — sem I/O, testados. Fonte única de verdade das fórmulas.

Toda tabela nova (`product_costs`, `expenses`, `tax_rules`) é tenant-scoped por
**RLS** (policy `tenant_isolation`, mesmo padrão do catálogo).

## DRE (cascata)
```
Receita bruta
(−) Comissão do marketplace
(−) Frete
(−) Impostos                  → alíquota efetiva por regime/categoria (tax.ts)
= Receita líquida
(−) CMV (custo das mercadorias)  → COGS por custo vigente na data (costs.ts)
= Lucro bruto
(−) Despesas operacionais        → recorrências expandidas no período (expenses.ts)
= Lucro líquido  (+ margem líquida)
```

**Garantia de consistência:** `/finance/dre` e o KPI `profit.net` do Overview usam a
MESMA função `buildDre` com os MESMOS inputs do período → o lucro líquido bate
(coberto por teste de integração `dre.int-spec`).

## Impostos (configurável)
Alíquota **efetiva** por regime (o contador informa), com override por categoria e
fallback ao default do regime. Defaults de partida (NÃO verdade fiscal absoluta):
Simples 6%, Lucro Presumido 11,33%, Lucro Real/MEI 0. Trocar `Company.taxRegime`
muda o imposto automaticamente. No MEI, o DAS fixo entra como despesa recorrente.

## Cobertura de custo
Honestidade: SKU sem custo = **cobertura faltante**, nunca custo 0. O DRE e o Overview
exibem `costCoveragePct`; com cobertura < 100%, CMV e lucro são parciais (avisado na UI).

## UI (`apps/web`)
- `/dashboard/costs` — custos por produto (+ import CSV).
- `/dashboard/finance/dre` — demonstrativo + seletor de período.
- `/dashboard/finance/expenses` — lançamento e lista de despesas.
- `/dashboard/finance/taxes` — alíquotas por regime/categoria.

## Permissões
Leitura `finance:read`; escrita `finance:write`. Escritas auditadas
(`finance.cost.*`, `finance.expense.*`, `finance.tax_rule.*`, `finance.dre.read`).

## Fora de escopo (próximas fases)
Fluxo de caixa, conciliação bancária, faixas/anexos completos do Simples (RBT12),
recomendação de preço.
