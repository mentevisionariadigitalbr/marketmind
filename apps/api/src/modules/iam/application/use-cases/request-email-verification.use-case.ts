import { Inject, Injectable, Logger } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { USER_TOKEN_REPOSITORY, UserTokenRepository } from '../../domain/ports/user-token.repository';
import { TOKEN_SERVICE, TokenService } from '../../domain/ports/token-service.port';
import { EMAIL_SENDER, EmailSender } from '../../../../shared/mail/email-sender.port';
import { emailVerificationEmail } from '../../../../shared/mail/email-templates';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Emite (ou reemite) o e-mail de verificação. Reutilizado no cadastro e no
 * "reenviar". No-op se o usuário não existir ou já estiver verificado. Falha de
 * envio não quebra o fluxo (verificação é não-bloqueante).
 */
@Injectable()
export class RequestEmailVerificationUseCase {
  private readonly logger = new Logger(RequestEmailVerificationUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(USER_TOKEN_REPOSITORY) private readonly userTokens: UserTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
  ) {}

  async execute(input: { userId: string; verifyUrlBase: string }): Promise<void> {
    const user = await this.users.findById(input.userId);
    if (!user || user.isEmailVerified) {
      return;
    }

    const rawToken = this.tokens.generateRefreshToken();
    await this.userTokens.issue({
      userId: user.id,
      companyId: user.companyId,
      type: 'EMAIL_VERIFICATION',
      tokenHash: this.tokens.hashToken(rawToken),
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    });

    const content = emailVerificationEmail(`${input.verifyUrlBase}?token=${rawToken}`);
    try {
      await this.email.send({ to: user.email, subject: content.subject, html: content.html, text: content.text });
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail de verificação: ${(err as Error).message}`);
    }
  }
}
