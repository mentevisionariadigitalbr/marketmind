import type { ParsedSale } from '../../application/manual-sales-csv';

export const CHANNELS_REPOSITORY = Symbol('ChannelsRepository');

export interface ChannelSummaryRow {
  marketplaceCode: string;
  nickname: string | null;
  revenue: number;
  orders: number;
  units: number;
}

export interface ChannelsRepository {
  /** Conta do canal manual da empresa (cria sob demanda). */
  getOrCreateManualAccountId(): Promise<string>;
  /** Importa vendas manuais (upsert idempotente por external_id). */
  importSales(accountId: string, rows: ParsedSale[]): Promise<{ imported: number }>;
  /** Receita/pedidos/unidades por canal no período. */
  channelSummary(days: number): Promise<ChannelSummaryRow[]>;
}
