import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';
import {
  CreatePlanUseCase,
  GetPlanUseCase,
  ListPlansUseCase,
  UpdatePlanUseCase,
} from '../../application/admin-plans.use-cases';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

/** CRUD de planos & preços (backoffice). Escritas auditadas. */
@Controller('admin/plans')
@UseGuards(PlatformAdminGuard)
export class AdminPlansController {
  constructor(
    private readonly list: ListPlansUseCase,
    private readonly get: GetPlanUseCase,
    private readonly create: CreatePlanUseCase,
    private readonly update: UpdatePlanUseCase,
  ) {}

  @Get()
  listPlans() {
    return this.list.execute();
  }

  @Get(':id')
  getPlan(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.get.execute(id);
  }

  @Post()
  @HttpCode(201)
  @AuditAction('admin.plan.create')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.create.execute(dto);
  }

  @Patch(':id')
  @AuditAction('admin.plan.update')
  updatePlan(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePlanDto) {
    return this.update.execute(id, dto);
  }
}
