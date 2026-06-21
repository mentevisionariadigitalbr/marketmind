import { Inject, Injectable } from '@nestjs/common';
import {
  LEGAL_ACCEPTANCE_REPOSITORY,
  LegalAcceptanceRepository,
} from '../domain/ports/legal-acceptance.repository';
import { ALL_LEGAL_DOCUMENTS, LEGAL_VERSIONS } from '../domain/legal-documents';

export interface AcceptAllInput {
  userId: string;
  companyId: string;
  ip: string | null;
  userAgent: string | null;
}

/**
 * Registra o aceite das versões vigentes de TODOS os documentos legais (Termos +
 * Privacidade). Chamado no cadastro (senha e Google) dentro da mesma transação.
 */
@Injectable()
export class RecordLegalAcceptanceService {
  constructor(
    @Inject(LEGAL_ACCEPTANCE_REPOSITORY) private readonly repo: LegalAcceptanceRepository,
  ) {}

  async acceptAll(input: AcceptAllInput): Promise<void> {
    for (const documentType of ALL_LEGAL_DOCUMENTS) {
      await this.repo.record({
        userId: input.userId,
        companyId: input.companyId,
        documentType,
        version: LEGAL_VERSIONS[documentType],
        ip: input.ip,
        userAgent: input.userAgent,
      });
    }
  }
}
