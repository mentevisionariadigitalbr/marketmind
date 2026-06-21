import { Inject, Injectable, Logger } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { USER_TOKEN_REPOSITORY, UserTokenRepository } from '../../domain/ports/user-token.repository';
import { TOKEN_SERVICE, TokenService } from '../../domain/ports/token-service.port';
import { EMAIL_SENDER, EmailSender } from '../../../../shared/mail/email-sender.port';
import { passwordResetEmail } from '../../../../shared/mail/email-templates';

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Solicita reset de senha. Resposta SEMPRE igual (não revela se o e-mail existe).
 * Se o usuário existir e tiver senha, gera token e envia o e-mail.
 */
@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(USER_TOKEN_REPOSITORY) private readonly userTokens: UserTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
  ) {}

  async execute(input: { email: string; resetUrlBase: string }): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user || !user.canAuthenticateWithPassword) {
      return; // silencioso: não revela cadastro
    }

    const rawToken = this.tokens.generateRefreshToken();
    await this.userTokens.issue({
      userId: user.id,
      companyId: user.companyId,
      type: 'PASSWORD_RESET',
      tokenHash: this.tokens.hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });

    const content = passwordResetEmail(`${input.resetUrlBase}?token=${rawToken}`);
    try {
      await this.email.send({ to: user.email, subject: content.subject, html: content.html, text: content.text });
    } catch (err) {
      // Falha de e-mail não vaza nem quebra o fluxo (a resposta é uniforme).
      this.logger.error(`Falha ao enviar e-mail de reset: ${(err as Error).message}`);
    }
  }
}
