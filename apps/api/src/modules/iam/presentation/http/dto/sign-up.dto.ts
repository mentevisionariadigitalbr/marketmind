import { Equals, IsBoolean, IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  companyName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  // Aceite obrigatório dos Termos + Privacidade (precisa ser exatamente true).
  @IsBoolean()
  @Equals(true, { message: 'É necessário aceitar os Termos de Uso e a Política de Privacidade.' })
  acceptedTerms!: boolean;
}
