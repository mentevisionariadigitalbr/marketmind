/** Porta de persistência de regras de imposto (Fase 2). */

export type TaxRegime = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | 'MEI';

export interface TaxRuleInput {
  readonly regime: TaxRegime;
  /** null = alíquota padrão do regime. */
  readonly category: string | null;
  /** Alíquota efetiva (fração 0..1). */
  readonly rate: number;
  readonly note?: string | null;
}

export interface TaxRuleRow {
  readonly id: string;
  readonly regime: TaxRegime;
  readonly category: string | null;
  readonly rate: number;
  readonly note: string | null;
}

export interface TaxRuleRepository {
  list(): Promise<TaxRuleRow[]>;
  /** Upsert por (regime, category): atualiza a alíquota se já existe, senão cria. */
  upsert(input: TaxRuleInput): Promise<TaxRuleRow>;
  delete(id: string): Promise<boolean>;
}
