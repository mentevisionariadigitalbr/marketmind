/** Entidade base: identidade + igualdade por id. */
export abstract class BaseEntity<Id = string> {
  protected constructor(public readonly id: Id) {}

  equals(other?: BaseEntity<Id>): boolean {
    return other instanceof BaseEntity && other.id === this.id;
  }
}

export interface DomainEvent {
  readonly name: string;
  readonly occurredAt: Date;
}

/**
 * Raiz de agregado: acumula eventos de domínio para publicação (Outbox).
 */
export abstract class AggregateRoot<Id = string> extends BaseEntity<Id> {
  private readonly _events: DomainEvent[] = [];

  protected addEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  pullEvents(): DomainEvent[] {
    const events = [...this._events];
    this._events.length = 0;
    return events;
  }
}
