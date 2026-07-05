import { Company, TaxRegime } from '../entities/company.entity';

export const COMPANY_REPOSITORY = Symbol('CompanyRepository');

export interface CreateCompanyData {
  name: string;
  taxId?: string | null;
  taxRegime?: TaxRegime;
}

export interface UpdateCompanyData {
  name?: string;
  taxId?: string | null;
  taxRegime?: TaxRegime;
}

export interface CompanyRepository {
  create(data: CreateCompanyData): Promise<Company>;
  findById(id: string): Promise<Company | null>;
  update(id: string, data: UpdateCompanyData): Promise<Company>;
}
