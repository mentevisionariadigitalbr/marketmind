import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_PLANS_REPOSITORY,
  AdminPlansRepository,
  AdminPlanView,
  UpdatePlanData,
} from '../domain/ports/admin-plans.repository';
import { NotFoundError } from '../../iam/application/errors';

export interface CreatePlanInput {
  code: string;
  name: string;
  priceCents: number;
  interval: string;
  currency?: string;
  trialDays?: number;
  maxMarketplaceAccounts?: number | null;
  maxProducts?: number | null;
  historyWindowDays?: number | null;
  stripePriceId?: string | null;
}

@Injectable()
export class ListPlansUseCase {
  constructor(@Inject(ADMIN_PLANS_REPOSITORY) private readonly repo: AdminPlansRepository) {}
  execute(): Promise<AdminPlanView[]> {
    return this.repo.listAll();
  }
}

@Injectable()
export class GetPlanUseCase {
  constructor(@Inject(ADMIN_PLANS_REPOSITORY) private readonly repo: AdminPlansRepository) {}
  async execute(id: string): Promise<AdminPlanView> {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundError('Plano');
    return plan;
  }
}

@Injectable()
export class CreatePlanUseCase {
  constructor(@Inject(ADMIN_PLANS_REPOSITORY) private readonly repo: AdminPlansRepository) {}
  execute(input: CreatePlanInput): Promise<AdminPlanView> {
    return this.repo.create({
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      priceCents: input.priceCents,
      currency: input.currency?.trim() || 'BRL',
      interval: input.interval,
      trialDays: input.trialDays ?? 14,
      maxMarketplaceAccounts: input.maxMarketplaceAccounts ?? null,
      maxProducts: input.maxProducts ?? null,
      historyWindowDays: input.historyWindowDays ?? null,
      stripePriceId: input.stripePriceId?.trim() || null,
    });
  }
}

@Injectable()
export class UpdatePlanUseCase {
  constructor(@Inject(ADMIN_PLANS_REPOSITORY) private readonly repo: AdminPlansRepository) {}
  async execute(id: string, data: UpdatePlanData): Promise<AdminPlanView> {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError('Plano');
    return updated;
  }
}
