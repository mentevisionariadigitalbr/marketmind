export const STOCK_MOVEMENT_REPOSITORY = Symbol('StockMovementRepository');

export type StockMovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'INVENTARIO' | 'DEVOLUCAO';

export interface CreateMovementData {
  productId: string;
  variantId: string | null;
  type: StockMovementType;
  /** Sinalizado: + entrada, − saída. */
  quantity: number;
  balanceAfter: number;
  unitCost: number | null;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string | null;
}

export interface MovementRow {
  id: string;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  reason: string | null;
  referenceType: string | null;
  occurredAt: string;
}

export interface ProductRef {
  id: string;
  sku: string | null;
  title: string;
  /** Disponível do anúncio no ML (mestre). */
  mlAvailable: number;
}

export interface ReconciliationRow {
  productId: string;
  sku: string | null;
  title: string;
  mlAvailable: number;
  ledgerBalance: number;
  /** ledgerBalance − mlAvailable (≠ 0 = divergência). */
  divergence: number;
}

/** Razão de estoque (tenant-scoped via RLS). ML segue mestre do disponível. */
export interface StockMovementRepository {
  /** Produto + disponível do ML; null se não existir/for de outra empresa. */
  findProduct(productId: string): Promise<ProductRef | null>;
  /** Saldo atual do razão (último balance_after) ou null se ainda sem movimentos. */
  currentLedgerBalance(productId: string): Promise<number | null>;
  create(data: CreateMovementData): Promise<void>;
  listByProduct(productId: string, limit: number): Promise<MovementRow[]>;
  /** Produtos COM movimentos: razão vs ML (divergência). */
  reconciliation(): Promise<ReconciliationRow[]>;
}
