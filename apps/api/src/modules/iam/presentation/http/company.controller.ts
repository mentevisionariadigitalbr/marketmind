import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateCompanyUseCase } from '../../application/use-cases/update-company.use-case';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './require-permissions.decorator';
import { CurrentUser } from './current-user.decorator';
import { PERMISSIONS } from '../../domain/permissions';
import type { AccessClaims } from '../../domain/ports/token-service.port';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';
import { UpdateCompanyDto } from './dto/update-company.dto';

/** Dados da empresa do tenant. Escrita exige company:write. */
@ApiTags('IAM')
@ApiBearerAuth()
@Controller('company')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyController {
  constructor(private readonly updateCompany: UpdateCompanyUseCase) {}

  @Patch()
  @RequirePermissions(PERMISSIONS.COMPANY_WRITE)
  @AuditAction('company.update')
  update(@CurrentUser() user: AccessClaims, @Body() dto: UpdateCompanyDto) {
    return this.updateCompany.execute({
      companyId: user.companyId,
      name: dto.name,
      taxId: dto.taxId,
      taxRegime: dto.taxRegime,
    });
  }
}
