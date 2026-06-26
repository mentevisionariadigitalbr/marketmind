import type { DigestData } from '../../application/digest';

export const DIGEST_DATA_REPOSITORY = Symbol('DigestDataRepository');

export interface DigestDataRepository {
  /** Números do digest para a empresa do contexto (tenant-scoped). */
  forCompany(): Promise<DigestData>;
}
