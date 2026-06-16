export type TaxRegime = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | 'MEI';

export interface CompanyProps {
  id: string;
  name: string;
  taxId: string | null;
  taxRegime: TaxRegime;
  createdAt: Date;
  updatedAt: Date;
}

/** Tenant raiz do sistema. */
export class Company {
  constructor(private readonly props: CompanyProps) {}

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get taxId(): string | null {
    return this.props.taxId;
  }
  get taxRegime(): TaxRegime {
    return this.props.taxRegime;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): CompanyProps {
    return { ...this.props };
  }
}
