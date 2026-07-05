import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsString, MaxLength } from 'class-validator';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import {
  GetSubscriptionUseCase,
  UpsertSubscriptionUseCase,
  SendDigestNowUseCase,
} from '../../application/report.use-cases';

class UpsertSubscriptionDto {
  @IsIn(['DAILY', 'WEEKLY']) frequency!: string;
  @IsString() @MaxLength(500) recipients!: string;
  @IsBoolean() enabled!: boolean;
}

/** Relatórios por e-mail (Fase 3, Inc.3). Leitura: notifications:read; escrita: notifications:write. */
@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    private readonly getSubscription: GetSubscriptionUseCase,
    private readonly upsertSubscription: UpsertSubscriptionUseCase,
    private readonly sendNow: SendDigestNowUseCase,
  ) {}

  @Get('subscription')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_READ)
  get() {
    return this.getSubscription.execute();
  }

  @Put('subscription')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_WRITE)
  @AuditAction('reports.subscription.upsert')
  async upsert(@Body() dto: UpsertSubscriptionDto) {
    await this.upsertSubscription.execute(dto);
    return { ok: true };
  }

  @Post('digest/send')
  @RequirePermissions(PERMISSIONS.NOTIFICATIONS_WRITE)
  @AuditAction('reports.digest.send')
  send() {
    return this.sendNow.execute();
  }
}
