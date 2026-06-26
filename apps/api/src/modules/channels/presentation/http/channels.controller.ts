import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import { ImportManualSalesUseCase, GetChannelSummaryUseCase } from '../../application/channels.use-cases';

class ImportManualSalesDto {
  @IsString() @MaxLength(200_000) csv!: string;
}

/** Canais (Fase 3, Inc.4). Resumo por marketplace + import de vendas manuais (CSV). */
@ApiTags('Channels')
@ApiBearerAuth()
@Controller('channels')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChannelsController {
  constructor(
    private readonly importManual: ImportManualSalesUseCase,
    private readonly summary: GetChannelSummaryUseCase,
  ) {}

  @Get('summary')
  @RequirePermissions(PERMISSIONS.INTEGRATION_READ)
  getSummary(@Query('days') days?: string) {
    return this.summary.execute(days ? Number(days) : undefined);
  }

  @Post('manual/import')
  @RequirePermissions(PERMISSIONS.INTEGRATION_WRITE)
  @AuditAction('channels.manual.import')
  import(@Body() dto: ImportManualSalesDto) {
    return this.importManual.execute(dto.csv);
  }
}
