export const CASHFLOW_REPOSITORY = Symbol('CashflowRepository');

export type PayableStatus = 'PENDING' | 'PAID';

export interface PayableRow {
  id: string;
  supplierId: string | null;
  supplierName: string | null;
  description: string | null;
  amount: number;
  dueDate: string;
  status: PayableStatus;
  paidAt: string | null;
  sourceType: string;
}

export interface CreatePayableData {
  supplierId: string | null;
  description: string | null;
  amount: number;
  dueDate: Date;
  createdBy: string | null;
}

export interface ReceivableRow {
  orderId: string;
  externalId: string;
  date: string;
  gross: number;
  commission: number;
  freight: number;
  net: number;
}

export interface CashEntryRow {
  date: string;
  amount: number;
}

/** Fluxo de caixa (tenant-scoped via RLS). */
export interface CashflowRepository {
  createPayable(data: CreatePayableData): Promise<string>;
  listPayables(): Promise<PayableRow[]>;
  /** false se não existir/já paga. */
  markPaid(id: string): Promise<boolean>;
  supplierExists(supplierId: string): Promise<boolean>;
  /** Saídas no período: data = liquidação (paid_at) ou vencimento (due_date). */
  payableEntries(from: Date, to: Date): Promise<CashEntryRow[]>;
  /** Entradas no período: líquido por pedido pago, datado na venda. */
  receivableEntries(from: Date, to: Date): Promise<CashEntryRow[]>;
  recentReceivables(limit: number): Promise<ReceivableRow[]>;
}
