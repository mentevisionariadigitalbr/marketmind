import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { LegalModule } from '../legal/legal.module';
import { PrivacyController } from './presentation/http/privacy.controller';
import { ExportMyDataUseCase } from './application/export-my-data.use-case';
import { DeleteMyAccountUseCase } from './application/delete-my-account.use-case';
import { PRIVACY_REPOSITORY } from './domain/ports/privacy.repository';
import { PrismaPrivacyRepository } from './infrastructure/persistence/prisma-privacy.repository';

/**
 * Direitos do titular (LGPD, Fase 6 Inc.3): exportação e exclusão de dados.
 * Importa o IamModule (guards) e o LegalModule (aceites, para o export).
 */
@Module({
  imports: [IamModule, LegalModule],
  controllers: [PrivacyController],
  providers: [
    ExportMyDataUseCase,
    DeleteMyAccountUseCase,
    { provide: PRIVACY_REPOSITORY, useClass: PrismaPrivacyRepository },
  ],
})
export class PrivacyModule {}
