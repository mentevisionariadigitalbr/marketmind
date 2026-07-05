import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { CHANNELS_REPOSITORY } from './domain/ports/channels.repository';
import { PrismaChannelsRepository } from './infrastructure/persistence/prisma-channels.repository';
import { ImportManualSalesUseCase, GetChannelSummaryUseCase } from './application/channels.use-cases';
import { ChannelsController } from './presentation/http/channels.controller';

/**
 * Canais (Fase 3, Inc.4). Consciência multi-marketplace (resumo por canal) +
 * canal manual para consolidar vendas de fora do ML via CSV.
 */
@Module({
  imports: [IamModule],
  controllers: [ChannelsController],
  providers: [
    ImportManualSalesUseCase,
    GetChannelSummaryUseCase,
    { provide: CHANNELS_REPOSITORY, useClass: PrismaChannelsRepository },
  ],
})
export class ChannelsModule {}
