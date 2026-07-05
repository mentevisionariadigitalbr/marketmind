import { Inject, Injectable } from '@nestjs/common';
import { COMPANY_REPOSITORY, CompanyRepository } from '../../domain/ports/company.repository';
import { TaxRegime } from '../../domain/entities/company.entity';

export interface UpdateCompanyInput {
  companyId: string;
  name?: string;
  taxId?: string | null;
  taxRegime?: TaxRegime;
}

/** Atualiza dados da empresa (nome, CNPJ, regime tributário). O regime alimenta
 *  o cálculo de impostos do DRE (Fase 2). */
@Injectable()
export class UpdateCompanyUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepository) {}

  async execute(input: UpdateCompanyInput) {
    const company = await this.companies.update(input.companyId, {
      name: input.name,
      taxId: input.taxId,
      taxRegime: input.taxRegime,
    });
    return company.toJSON();
  }
}
