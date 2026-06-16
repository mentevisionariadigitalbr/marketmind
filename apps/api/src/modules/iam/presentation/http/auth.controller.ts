import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';
import type { AccessClaims } from '../../domain/ports/token-service.port';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly signUp: SignUpUseCase,
    private readonly signIn: SignInUseCase,
    private readonly refresh: RefreshTokenUseCase,
    private readonly getMe: GetMeUseCase,
    private readonly logout: LogoutUseCase,
    private readonly googleSignIn: GoogleSignInUseCase,
  ) {}

  @Post('signup')
  @HttpCode(201)
  @AuditAction('auth.signup')
  async signup(@Body() dto: SignUpDto, @Req() req: Request) {
    return this.signUp.execute({ ...dto, ...this.context(req) });
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

  private context(req: Request): { userAgent: string | null; ip: string | null } {
    return {
      userAgent: req.headers['user-agent'] ?? null,
      ip: req.ip ?? null,
    };
  }
}
