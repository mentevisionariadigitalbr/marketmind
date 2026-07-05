/**
 * Catálogo de KPIs (contratos). Cada KPI declara unidade e disponibilidade
 * (calculável hoje vs. requer tabelas financeiras — ver docs/dashboard-architecture.md).
 * NÃO há cálculo aqui; apenas a taxonomia que API/UI compartilham.
 */

export type KpiUnit = 'BRL' | 'count' | 'percent' | 'ratio' | 'days';

/** Origem de dados pronta hoje, ou bloqueada por tabela/integração ausente. */
export type KpiAvailability = 'available' | 'needs-table' | 'needs-integration';

export const KPI_KEYS = [
  // Receita
  'revenue.today',
  'revenue.month',
  'revenue.year',
  // Pedidos
  'orders.today',
  'orders.month',
  'orders.year',
  'orders.averageTicket',
  // Crescimento / velocidade
  'growth.rate',
  'sales.velocity',
  // Margens / lucro
  'margin.contribution',
  'margin.gross',
  'margin.net',
  'profit.gross',
  'profit.net',
  // Produtos / estoque
  'products.active',
  'products.withoutStock',
  'inventory.criticalStock',
  'inventory.valueAtPrice',
  'inventory.valueAtCost',
  'inventory.turnover',
  'inventory.coverageDays',
  // Clientes
  'customer.ltv',
  'customer.aov',
  'customer.frequency',
] as const;

export type KpiKey = (typeof KPI_KEYS)[number];

export interface KpiDescriptor {
  readonly key: KpiKey;
  readonly label: string;
  readonly unit: KpiUnit;
  readonly availability: KpiAvailability;
}

/** Metadado de cada KPI: rótulo, unidade e se já é calculável hoje. */
export const KPI_CATALOG: Readonly<Record<KpiKey, KpiDescriptor>> = {
  'revenue.today': { key: 'revenue.today', label: 'Receita (hoje)', unit: 'BRL', availability: 'available' },
  'revenue.month': { key: 'revenue.month', label: 'Receita (mês)', unit: 'BRL', availability: 'available' },
  'revenue.year': { key: 'revenue.year', label: 'Receita (ano)', unit: 'BRL', availability: 'available' },
  'orders.today': { key: 'orders.today', label: 'Pedidos (hoje)', unit: 'count', availability: 'available' },
  'orders.month': { key: 'orders.month', label: 'Pedidos (mês)', unit: 'count', availability: 'available' },
  'orders.year': { key: 'orders.year', label: 'Pedidos (ano)', unit: 'count', availability: 'available' },
  'orders.averageTicket': { key: 'orders.averageTicket', label: 'Ticket médio', unit: 'BRL', availability: 'available' },
  'growth.rate': { key: 'growth.rate', label: 'Crescimento', unit: 'percent', availability: 'available' },
  'sales.velocity': { key: 'sales.velocity', label: 'Velocidade de vendas', unit: 'ratio', availability: 'available' },
  'margin.contribution': { key: 'margin.contribution', label: 'Margem de contribuição', unit: 'percent', availability: 'available' },
  'margin.gross': { key: 'margin.gross', label: 'Margem bruta', unit: 'percent', availability: 'needs-table' },
  'margin.net': { key: 'margin.net', label: 'Margem líquida', unit: 'percent', availability: 'needs-table' },
  'profit.gross': { key: 'profit.gross', label: 'Lucro bruto', unit: 'BRL', availability: 'needs-table' },
  'profit.net': { key: 'profit.net', label: 'Lucro líquido', unit: 'BRL', availability: 'needs-table' },
  'products.active': { key: 'products.active', label: 'Produtos ativos', unit: 'count', availability: 'available' },
  'products.withoutStock': { key: 'products.withoutStock', label: 'Produtos sem estoque', unit: 'count', availability: 'available' },
  'inventory.criticalStock': { key: 'inventory.criticalStock', label: 'Estoque crítico', unit: 'count', availability: 'available' },
  'inventory.valueAtPrice': { key: 'inventory.valueAtPrice', label: 'Valor de estoque (a preço)', unit: 'BRL', availability: 'available' },
  'inventory.valueAtCost': { key: 'inventory.valueAtCost', label: 'Valor de estoque (a custo)', unit: 'BRL', availability: 'needs-table' },
  'inventory.turnover': { key: 'inventory.turnover', label: 'Giro de estoque', unit: 'ratio', availability: 'available' },
  'inventory.coverageDays': { key: 'inventory.coverageDays', label: 'Cobertura de estoque', unit: 'days', availability: 'available' },
  'customer.ltv': { key: 'customer.ltv', label: 'LTV', unit: 'BRL', availability: 'available' },
  'customer.aov': { key: 'customer.aov', label: 'Ticket por cliente (AOV)', unit: 'BRL', availability: 'available' },
  'customer.frequency': { key: 'customer.frequency', label: 'Frequência de compra', unit: 'ratio', availability: 'available' },
};

export type TrendDirection = 'up' | 'down' | 'flat';

/** Valor de um KPI já calculado, pronto para a UI. */
export interface KpiValue {
  readonly key: KpiKey;
  readonly label: string;
  readonly unit: KpiUnit;
  readonly value: number;
  readonly trend?: {
    readonly direction: TrendDirection;
    readonly changePct: number;
  };
}
