import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  /** ID token (JWT) emitido pelo Google Identity Services no cliente. */
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  /** Aceite legal — necessário só quando o login cria uma conta nova (tela de cadastro). */
  @IsOptional()
  @IsBoolean()
  acceptedTerms?: boolean;
}
