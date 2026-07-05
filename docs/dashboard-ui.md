# Dashboard — UX & Component Library (Sprint 3.0, FASES 6 e 7)

**Design only.** Layout, estados e contratos de props dos componentes —
**nenhuma tela/gráfico/componente implementado** (isso é a Sprint 3.1).
Referências: Stripe, Linear, Vercel, Shopify (densidade, hierarquia, calma visual).

## Layout (App Shell)

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar:  logo · marketplace selector · period · busca · user  │
├────────────┬─────────────────────────────────────────────────┤
│ Sidebar    │  Workspace                                       │
│  Overview  │  ┌─ Filters bar (period · account · category) ─┐ │
│  Vendas    │  ├──────────────────────────────────────────────┤ │
│  Produtos  │  │ KPI cards (grid responsivo 4→2→1)            │ │
│  Estoque   │  ├──────────────────────────────────────────────┤ │
│  Clientes  │  │ Revenue chart        │ Orders chart          │ │
│  ABC       │  ├──────────────────────┴──────────────────────┤ │
│            │  │ Top products table   │ ABC / Category chart  │ │
│            │  └──────────────────────────────────────────────┘ │
└────────────┴─────────────────────────────────────────────────┘
```

- **Responsivo**: grid 12 col; cards 4→2→1; sidebar colapsa em drawer < md.
- **Drawer/Modal**: drill-down (clicar num produto abre Drawer com detalhe).
- **Densidade**: tabelas compactas, números tabulares, espaçamento de 8px base.

## Estados (obrigatórios em todo widget)
| Estado | Regra |
|--------|-------|
| **Loading** | Skeleton (não spinner) com a forma do conteúdo |
| **Empty** | Ilustração + CTA ("Sincronize um pedido para ver receita") |
| **Error** | Mensagem + retry; nunca tela branca |
| **Stale** | Badge "atualizado há Xmin" quando `health.status != ok` |
| **Blocked** | KPIs `needs-table`: card com cadeado + "Requer módulo Financeiro" |

## Biblioteca de componentes (contratos de props — design)

Componentes **desacoplados de fetch**: recebem dados por props, sem chamar API
direto. Container (server/route) busca; apresentacional renderiza. Tipos de dados
reutilizam os DTOs de `@marketmind/dashboard-core`.

| Componente | Props (design) | Papel |
|------------|----------------|-------|
| `DashboardCard` | `title, action?, children` | Container visual base |
| `MetricCard` | `label, value, unit, trend?, loading?` | KPI singular |
| `KPICard` | `kpi: KpiValue, loading?` | MetricCard ligado ao catálogo |
| `TrendIndicator` | `direction, changePct` | Seta + % com cor semântica |
| `RevenueChart` | `data: TimelinePointDTO[], granularity` | Linha/área de receita |
| `OrdersChart` | `data: TimelinePointDTO[]` | Barras de pedidos |
| `InventoryChart` | `data: InventoryDTO` | Donut valor/cobertura |
| `ABCChart` | `data: AbcDTO` | Pareto (barras + linha acumulada) |
| `CategoryChart` | `data: CategoryDTO[]` | Barras por categoria |
| `TopProductsTable` | `rows: TopProductDTO[], onRowClick?` | Ranking com drill-down |
| `PeriodSelector` | `value, onChange` | Hoje/Semana/Mês/Ano/custom |
| `MarketplaceSelector` | `accounts, value, onChange` | Filtro por conta |
| `DateRangePicker` | `value: DateRange, onChange` | Intervalo custom |
| `Skeleton` | `variant` | Placeholder de loading |
| `EmptyState` / `ErrorState` | `title, description, action?` | Estados vazios/erro |

## Princípios de implementação (para a 3.1)
- **Apresentacional ≠ data-fetching**: zero `fetch` dentro de componentes de UI.
- **Design tokens** (cor/espaçamento/tipografia) centralizados — sem cor hardcoded.
- **Acessibilidade**: contraste AA, foco visível, `aria` em gráficos (tabela alt).
- **i18n**: textos em pt-BR via catálogo (sem strings soltas).
- **Charts**: uma única lib de gráfico atrás de um wrapper próprio — trocável
  sem tocar nas telas.
