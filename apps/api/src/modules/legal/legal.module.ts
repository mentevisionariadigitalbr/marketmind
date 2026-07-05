import { Module } from '@nestjs/common';
import { RecordLegalAcceptanceService } from './application/record-legal-acceptance.service';
import { LEGAL_ACCEPTANCE_REPOSITORY } from './domain/ports/legal-acceptance.repository';
import { PrismaLegalAcceptanceRepository } from './infrastructure/persistence/prisma-legal-acceptance.repository';

/**
 * Módulo Legal & LGPD (Fase 6). Inc.1: aceite versionado de Termos/Privacidade.
 * Exporta o serviço de registro para o IAM usar no cadastro. Exportação/exclusão
 * de dados (direitos do titular) entram no Inc.3.
 */
@Module({
  providers: [
    RecordLegalAcceptanceService,
    { provide: LEGAL_ACCEPTANCE_REPOSITORY, useClass: PrismaLegalAcceptanceRepository },
  ],
  exports: [RecordLegalAcceptanceService, LEGAL_ACCEPTANCE_REPOSITORY],
})
export class LegalModule {}
