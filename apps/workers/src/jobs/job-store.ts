export interface JobRecord {
  queue: string;
  jobId: string;
  jobName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  companyId?: string | null;
  payload?: unknown;
  attempts: number;
  startedAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  error?: string;
}

/** Persiste o estado dos jobs (espelho da fila) — centro de observabilidade. */
export interface JobStore {
  save(record: JobRecord): Promise<void>;
}
