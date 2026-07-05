import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { MailModule } from '../../shared/mail/mail.module';
import { REPORT_SUBSCRIPTION_REPOSITORY } from './domain/ports/report-subscription.repository';
import { DIGEST_DATA_REPOSITORY } from './domain/ports/digest-data.repository';
import { PrismaReportSubscriptionRepository } from './infrastructure/persistence/prisma-report-subscription.repository';
import { PrismaDigestDataRepository } from './infrastructure/persistence/prisma-digest-data.repository';
import { ReportDigestScheduler } from './infrastructure/report-digest.scheduler';
import {
  DigestSender,
  GetSubscriptionUseCase,
  UpsertSubscriptionUseCase,
  SendDigestNowUseCase,
  RunDueDigestsUseCase,
} from './application/report.use-cases';
import { ReportsController } from './presentation/http/reports.controller';

/**
 * Relatórios por e-mail (Fase 3, Inc.3). Assinatura por empresa, digest com o
 * resumo de vendas/estoque/contas, envio sob demanda e agendador opt-in.
 */
@Module({
  imports: [IamModule, MailModule],
  controllers: [ReportsController],
  providers: [
    DigestSender,
    GetSubscriptionUseCase,
    UpsertSubscriptionUseCase,
    SendDigestNowUseCase,
    RunDueDigestsUseCase,
    ReportDigestScheduler,
    { provide: REPORT_SUBSCRIPTION_REPOSITORY, useClass: PrismaReportSubscriptionRepository },
    { provide: DIGEST_DATA_REPOSITORY, useClass: PrismaDigestDataRepository },
  ],
})
export class ReportsModule {}
