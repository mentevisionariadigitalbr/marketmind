export const UNIT_OF_WORK = Symbol('UnitOfWork');

export interface UnitOfWork {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}
