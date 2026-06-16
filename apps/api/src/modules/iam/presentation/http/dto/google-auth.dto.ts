import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  /** ID token (JWT) emitido pelo Google Identity Services no cliente. */
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
