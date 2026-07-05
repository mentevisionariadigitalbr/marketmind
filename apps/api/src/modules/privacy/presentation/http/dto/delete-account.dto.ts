import { Equals, IsString } from 'class-validator';

/** Confirmação explícita para a ação irreversível de exclusão de conta. */
export class DeleteAccountDto {
  @IsString()
  @Equals('EXCLUIR', { message: 'Digite EXCLUIR para confirmar a exclusão da conta.' })
  confirmation!: string;
}
