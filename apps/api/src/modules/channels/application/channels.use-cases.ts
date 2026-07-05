import { Inject, Injectable } from '@nestjs/common';
import { CHANNELS_REPOSITORY, ChannelsRepository, ChannelSummaryRow } from '../domain/ports/channels.repository';
import { parseManualSalesCsv } from './manual-sales-csv';
import { ValidationError } from '../../iam/application/errors';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class ImportManualSalesUseCase {
  constructor(@Inject(CHANNELS_REPOSITORY) private readonly repo: ChannelsRepository) {}

  async execute(csv: string): Promise<ImportResult> {
    if (!csv?.trim()) throw new ValidationError('Cole o conteúdo do CSV.');
    const { rows, errors } = parseManualSalesCsv(csv);
    if (rows.length === 0) {
      return { imported: 0, skipped: errors.length, errors };
    }
    const accountId = await this.repo.getOrCreateManualAccountId();
    const { imported } = await this.repo.importSales(accountId, rows);
    return { imported, skipped: errors.length, errors };
  }
}

@Injectable()
export class GetChannelSummaryUseCase {
  constructor(@Inject(CHANNELS_REPOSITORY) private readonly repo: ChannelsRepository) {}
  execute(days = 30): Promise<ChannelSummaryRow[]> {
    return this.repo.channelSummary(Math.min(Math.max(days, 1), 365));
  }
}
