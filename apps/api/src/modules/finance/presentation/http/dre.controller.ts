import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import { DreService } from '../../application/dre.service';
import { DrePeriodQueryDto, DreResponseDto } from './dto/dre.dto';

/** DRE consolidado (Fase 2). Leitura: finance:read. */
@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance/dre')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.FINANCE_READ)
@AuditAction('finance.dre.read')
export class DreController {
  constructor(private readonly dre: DreService) {}

  @Get()
  @ApiOkResponse({ type: DreResponseDto })
  get(@Query() q: DrePeriodQueryDto) {
    return this.dre.build(q);
  }
}
