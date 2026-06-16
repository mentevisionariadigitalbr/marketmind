import { User, UserRole } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('UserRepository');

export interface CreateUserData {
  companyId: string;
  name: string;
  email: string;
  passwordHash?: string | null;
  googleId?: string | null;
  role?: UserRole;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  /** Vincula uma conta Google a um usuário existente (login social). */
  attachGoogleId(userId: string, googleId: string): Promise<User>;
}
