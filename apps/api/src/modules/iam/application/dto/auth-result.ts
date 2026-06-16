import { UserProps } from '../../domain/entities/user.entity';

export type PublicUser = Omit<UserProps, 'passwordHash'>;

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}
