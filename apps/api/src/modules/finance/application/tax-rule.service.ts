import { Inject, Injectable } from '@nestjs/common';
import { TAX_RULE_REPOSITORY } from '../finance.tokens';
import { TaxRegime, TaxRuleRepository, TaxRuleRow } from '../domain/tax-rule.repository';

export interface UpsertTaxRuleCommand {
  readonly regime: TaxRegime;
  readonly category?: string | null;
  readonly rate: number;
  readonly note?: string;
}

/** Configuração de alíquotas efetivas (Fase 2). Lado de escrita; o DRE consome
 *  via DASHBOARD_QUERY_PORT.getTaxes. */
@Injectable()
export class TaxRuleService {
  constructor(@Inject(TAX_RULE_REPOSITORY) private readonly repo: TaxRuleRepository) {}

  list(): Promise<TaxRuleRow[]> {
    return this.repo.list();
  }

  upsert(cmd: UpsertTaxRuleCommand): Promise<TaxRuleRow> {
    return this.repo.upsert({
      regime: cmd.regime,
      category: cmd.category ?? null,
      rate: cmd.rate,
      note: cmd.note ?? null,
    });
  }

  delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}
