import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SignUpUseCase } from '../../application/use-cases/sign-up.use-case';
import { SignInUseCase } from '../../application/use-cases/sign-in.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { GetMeUseCase } from '../../application/use-cases/get-me.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { GoogleSignInUseCase } from '../../application/use-cases/google-sign-in.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case';
import { AcceptInviteUseCase } from '../../application/use-cases/accept-invite.use-case';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { RequestEmailVerificationUseCase } from '../../application/use-cases/request-email-verification.use-case';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { UpdateProfileDto, ChangePasswordDto } from './dto/account.dto';
import { AcceptInviteDto } from './dto/team.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';
import type { AccessClaims } from '../../domain/ports/token-service.port';

// Limite estrito anti-brute-force nas rotas de autenticação (Sprint 3.2).
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly signUp: SignUpUseCase,
    private readonly signIn: SignInUseCase,
    private readonly refresh: RefreshTokenUseCase,
    private readonly getMe: GetMeUseCase,
    private readonly logout: LogoutUseCase,
    private readonly googleSignIn: GoogleSignInUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly acceptInvite: AcceptInviteUseCase,
    private readonly forgotPassword: ForgotPasswordUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly requestEmailVerification: RequestEmailVerificationUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('signup')
  @HttpCode(201)
  @AuditAction('auth.signup')
  async signup(@Body() dto: SignUpDto, @Req() req: Request) {
    return this.signUp.execute({
      ...dto,
      ...this.context(req),
      verifyUrlBase: `${this.webBaseUrl()}/verify-email`,
    });
  }

  @Post('login')
  @HttpCode(200)
  @AuditAction('auth.login')
  async login(@Body() dto: SignInDto, @Req() req: Request) {
    return this.signIn.execute({ ...dto, ...this.context(req) });
  }

  @Post('refresh')
  @HttpCode(200)
  @AuditAction('auth.refresh')
  async refreshToken(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.refresh.execute({ refreshToken: dto.refreshToken, ...this.context(req) });
  }

  @Post('google')
  @HttpCode(200)
  @AuditAction('auth.google')
  async google(@Body() dto: GoogleAuthDto, @Req() req: Request) {
    return this.googleSignIn.execute({ idToken: dto.idToken, ...this.context(req) });
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @AuditAction('auth.logout')
  async logoutSession(@Body() dto: RefreshDto): Promise<void> {
    await this.logout.execute({ refreshToken: dto.refreshToken });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AccessClaims) {
    return this.getMe.execute({ userId: user.sub });
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @AuditAction('auth.profile.update')
  async updateMe(@CurrentUser() user: AccessClaims, @Body() dto: UpdateProfileDto) {
    return this.updateProfile.execute({ userId: user.sub, name: dto.name });
  }

  @Post('change-password')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @AuditAction('auth.password.change')
  async changePasswordAction(@CurrentUser() user: AccessClaims, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.changePassword.execute({
      userId: user.sub,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }

  /** Aceite de convite (público): define a senha e ativa o membro. */
  @Post('accept-invite')
  @HttpCode(204)
  @AuditAction('auth.accept_invite')
  async acceptInviteAction(@Body() dto: AcceptInviteDto): Promise<void> {
    await this.acceptInvite.execute({ token: dto.token, password: dto.password });
  }

  /**
   * Solicita redefinição de senha (público). Resposta SEMPRE 202, independentemente
   * de o e-mail existir ou não (evita enumeração de cadastro).
   */
  @Post('forgot-password')
  @HttpCode(202)
  @AuditAction('auth.password.forgot')
  async forgotPasswordAction(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.forgotPassword.execute({
      email: dto.email,
      resetUrlBase: `${this.webBaseUrl()}/reset-password`,
    });
  }

  /** Redefine a senha a partir do token (público, uso único). */
  @Post('reset-password')
  @HttpCode(204)
  @AuditAction('auth.password.reset')
  async resetPasswordAction(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.resetPassword.execute({ token: dto.token, password: dto.password });
  }

  /** Confirma o e-mail a partir do token (público, uso único). */
  @Post('verify-email')
  @HttpCode(204)
  @AuditAction('auth.email.verify')
  async verifyEmailAction(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.verifyEmail.execute({ token: dto.token });
  }

  /** Reenvia o e-mail de verificação para o usuário autenticado. */
  @Post('resend-verification')
  @HttpCode(202)
  @UseGuards(JwtAuthGuard)
  @AuditAction('auth.email.resend_verification')
  async resendVerificationAction(@CurrentUser() user: AccessClaims): Promise<void> {
    await this.requestEmailVerification.execute({
      userId: user.sub,
      verifyUrlBase: `${this.webBaseUrl()}/verify-email`,
    });
  }

  private context(req: Request): { userAgent: string | null; ip: string | null } {
    return {
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip ?? null,
    };
  }

  /** Origem da aplicação web (para montar links de e-mail). */
  private webBaseUrl(): string {
    return this.config.get<string>('CORS_ORIGIN')?.split(',')[0]?.trim() ?? 'http://localhost:3000';
  }
}
