import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { CurrentUser } from '../../../iam/presentation/http/current-user.decorator';
import type { AccessClaims } from '../../../iam/domain/ports/token-service.port';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';
import { ExportMyDataUseCase } from '../../application/export-my-data.use-case';
import { DeleteMyAccountUseCase } from '../../application/delete-my-account.use-case';
import { DeleteAccountDto } from './dto/delete-account.dto';

/**
 * Direitos do titular (LGPD). Qualquer usuário autenticado pode exportar e excluir
 * os próprios dados (não exige permissão de RBAC — é um direito do titular).
 */
@Controller('privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(
    private readonly exportData: ExportMyDataUseCase,
    private readonly deleteAccount: DeleteMyAccountUseCase,
  ) {}

  /** Exporta os dados pessoais do usuário (JSON portável). */
  @Get('export')
  @AuditAction('privacy.export')
  async export(@CurrentUser() user: AccessClaims) {
    return this.exportData.execute({ userId: user.sub, companyId: user.companyId });
  }

  /** Exclui a conta (anonimização imediata). OWNER exclui a empresa inteira. */
  @Post('delete-account')
  @HttpCode(200)
  @AuditAction('privacy.delete_account')
  async remove(@CurrentUser() user: AccessClaims, @Body() _dto: DeleteAccountDto) {
    return this.deleteAccount.execute({
      userId: user.sub,
      companyId: user.companyId,
      role: user.role,
    });
  }
}
