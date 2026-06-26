import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';
import { AdminLoginUseCase } from '../../application/admin-login.use-case';
import { AdminLoginDto } from './dto/admin-login.dto';

/** Login do super-admin de plataforma (público, anti-brute-force estrito). */
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly login: AdminLoginUseCase) {}

  @Post('login')
  @HttpCode(200)
  @AuditAction('admin.auth.login')
  async signIn(@Body() dto: AdminLoginDto) {
    return this.login.execute({ email: dto.email, password: dto.password });
  }
}
