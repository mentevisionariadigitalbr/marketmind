/**
 * Result/Either tipados para fluxos sem exceções (railway-oriented).
 * `Result<T, E>` = `Ok<T>` | `Err<E>`.
 */
export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

export class Ok<T, E = Error> {
  readonly _tag = 'ok' as const;
  constructor(public readonly value: T) {}
  isOk(): this is Ok<T, E> {
    return true;
  }
  isErr(): this is Err<T, E> {
    return false;
  }
  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }
  unwrap(): T {
    return this.value;
  }
}

export class Err<T, E = Error> {
  readonly _tag = 'err' as const;
  constructor(public readonly error: E) {}
  isOk(): this is Ok<T, E> {
    return false;
  }
  isErr(): this is Err<T, E> {
    return true;
  }
  map<U>(): Result<U, E> {
    return new Err<U, E>(this.error);
  }
  unwrap(): never {
    throw this.error instanceof Error ? this.error : new Error(String(this.error));
  }
}

export const ok = <T, E = Error>(value: T): Result<T, E> => new Ok(value);
export const err = <T = never, E = Error>(error: E): Result<T, E> => new Err(error);

/** Either: alias semântico (Left = falha, Right = sucesso). */
export type Either<L, R> = Result<R, L>;
export const left = <L, R = never>(value: L): Either<L, R> => new Err(value);
export const right = <R, L = never>(value: R): Either<L, R> => new Ok(value);
