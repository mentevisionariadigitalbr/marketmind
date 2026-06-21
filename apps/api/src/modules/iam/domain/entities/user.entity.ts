export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type UserStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';

export interface UserProps {
  id: string;
  companyId: string;
  name: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  constructor(private readonly props: UserProps) {}

  get id(): string {
    return this.props.id;
  }
  get companyId(): string {
    return this.props.companyId;
  }
  get name(): string {
    return this.props.name;
  }
  get email(): string {
    return this.props.email;
  }
  get passwordHash(): string | null {
    return this.props.passwordHash;
  }
  get googleId(): string | null {
    return this.props.googleId;
  }
  get role(): UserRole {
    return this.props.role;
  }
  get status(): UserStatus {
    return this.props.status;
  }
  get emailVerifiedAt(): Date | null {
    return this.props.emailVerifiedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  get canAuthenticateWithPassword(): boolean {
    return this.props.passwordHash !== null;
  }

  get isEmailVerified(): boolean {
    return this.props.emailVerifiedAt !== null;
  }

  /** Representação segura (sem hash de senha) para respostas HTTP. */
  toPublic(): Omit<UserProps, 'passwordHash'> {
    const { passwordHash: _omit, ...rest } = this.props;
    return rest;
  }
}
