import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../domain/ports/company.repository';
import { CompanyProps } from '../../domain/entities/company.entity';
import { PublicUser } from '../dto/auth-result';
import { NotFoundError } from '../errors';

export interface GetMeResult {
  user: PublicUser;
  company: CompanyProps;
}

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepository,
  ) {}

  async execute(input: { userId: string }): Promise<GetMeResult> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new NotFoundError('Usuário');
    }

    const company = await this.companies.findById(user.companyId);
    if (!company) {
      throw new NotFoundError('Empresa');
    }

    return { user: user.toPublic(), company: company.toJSON() };
  }
}
