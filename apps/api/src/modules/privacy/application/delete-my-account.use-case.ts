import { Inject, Injectable } from '@nestjs/common';
import {
  DataSubjectScope,
  PRIVACY_REPOSITORY,
  PrivacyRepository,
} from '../domain/ports/privacy.repository';

export interface DeleteAccountResult {
  scope: DataSubjectScope;
}

/**
 * Exclusão de conta (LGPD art. 18, VI). Por papel:
 *  - OWNER  → escopo COMPANY: anonimiza todos os usuários e purga os dados de
 *             negócio da empresa (retém faturas/assinaturas por obrigação fiscal).
 *  - demais → escopo USER: anonimiza apenas o próprio usuário.
 * Execução imediata; as mutações são idempotentes.
 */
@Injectable()
export class DeleteMyAccountUseCase {
  constructor(@Inject(PRIVACY_REPOSITORY) private readonly privacy: PrivacyRepository) {}

  async execute(input: { userId: string; companyId: string; role: string }): Promise<DeleteAccountResult> {
    const scope: DataSubjectScope = input.role === 'OWNER' ? 'COMPANY' : 'USER';
    await this.privacy.deleteAccount({
      requesterUserId: input.userId,
      companyId: input.companyId,
      scope,
    });
    return { scope };
  }
}
