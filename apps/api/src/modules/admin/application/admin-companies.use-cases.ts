import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_COMPANIES_REPOSITORY,
  AdminCompaniesRepository,
  CompanyDetail,
  CompanyListPage,
} from '../domain/ports/admin-companies.repository';
import { NotFoundError } from '../../iam/application/errors';

@Injectable()
export class ListCompaniesUseCase {
  constructor(@Inject(ADMIN_COMPANIES_REPOSITORY) private readonly repo: AdminCompaniesRepository) {}

  execute(params: { page: number; pageSize: number; status?: string }): Promise<CompanyListPage> {
    return this.repo.listCompanies(params);
  }
}

@Injectable()
export class GetCompanyDetailUseCase {
  constructor(@Inject(ADMIN_COMPANIES_REPOSITORY) private readonly repo: AdminCompaniesRepository) {}

  async execute(id: string): Promise<CompanyDetail> {
    const detail = await this.repo.getCompanyDetail(id);
    if (!detail) throw new NotFoundError('Empresa');
    return detail;
  }
}
