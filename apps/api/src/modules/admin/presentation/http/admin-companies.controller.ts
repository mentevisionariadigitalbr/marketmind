import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PlatformAdminGuard } from './platform-admin.guard';
import { CurrentAdmin } from './current-admin.decorator';
import { AdminClaims } from '../../domain/admin-claims';
import {
  GetCompanyDetailUseCase,
  ListCompaniesUseCase,
} from '../../application/admin-companies.use-cases';
import { ImpersonateCompanyUseCase } from '../../application/impersonate-company.use-case';

/** Empresas/clientes do backoffice (somente leitura, cross-tenant) + impersonação. */
@Controller('admin/companies')
@UseGuards(PlatformAdminGuard)
export class AdminCompaniesController {
  constructor(
    private readonly list: ListCompaniesUseCase,
    private readonly detail: GetCompanyDetailUseCase,
    private readonly impersonate: ImpersonateCompanyUseCase,
  ) {}

  @Get()
  listCompanies(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.list.execute({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      status: status || undefined,
    });
  }

  @Get(':id')
  getCompany(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.detail.execute(id);
  }

  /** Entra como cliente (SOMENTE LEITURA) — emite um token de tenant auditado. */
  @Post(':id/impersonate')
  @HttpCode(200)
  impersonateCompany(
    @CurrentAdmin() admin: AdminClaims,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
  ) {
    return this.impersonate.execute({
      adminId: admin.sub,
      companyId: id,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }
}
