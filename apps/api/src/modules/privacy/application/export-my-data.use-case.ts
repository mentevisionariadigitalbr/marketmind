import { Inject, Injectable } from '@nestjs/common';
import { PRIVACY_REPOSITORY, PrivacyRepository } from '../domain/ports/privacy.repository';
import {
  LEGAL_ACCEPTANCE_REPOSITORY,
  LegalAcceptanceRepository,
} from '../../legal/domain/ports/legal-acceptance.repository';

/**
 * Exporta os dados pessoais do usuário corrente (LGPD art. 18, II/V). Registra o
 * pedido e devolve um JSON portável.
 */
@Injectable()
export class ExportMyDataUseCase {
  constructor(
    @Inject(PRIVACY_REPOSITORY) private readonly privacy: PrivacyRepository,
    @Inject(LEGAL_ACCEPTANCE_REPOSITORY) private readonly acceptances: LegalAcceptanceRepository,
  ) {}

  async execute(input: { userId: string; companyId: string }) {
    await this.privacy.recordRequest({
      userId: input.userId,
      companyId: input.companyId,
      type: 'EXPORT',
      scope: 'USER',
    });

    const data = await this.privacy.exportUserData(input.userId, input.companyId);
    const legalAcceptances = await this.acceptances.listForUser(input.userId);

    return {
      generatedAt: new Date().toISOString(),
      subject: { userId: input.userId, companyId: input.companyId },
      ...data,
      legalAcceptances: legalAcceptances.map((a) => ({
        documentType: a.documentType,
        version: a.version,
        acceptedAt: a.acceptedAt.toISOString(),
      })),
    };
  }
}
