import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PrismaService } from '../../shared/prisma/prisma.service';
import { parseDurationMs } from '../../shared/util/duration';

import { AuthController } from './presentation/http/auth.controller';
import { RolesController } from './presentation/http/roles.controller';
import { JwtAuthGuard } from './presentation/http/jwt-auth.guard';
import { PermissionsGuard } from './presentation/http/permissions.guard';

import { SignUpUseCase } from './application/use-cases/sign-up.use-case';
import { SignInUseCase } from './application/use-cases/sign-in.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { GetMeUseCase } from './application/use-cases/get-me.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { GoogleSignInUseCase } from './application/use-cases/google-sign-in.use-case';
import { IssueTokensService } from './application/services/issue-tokens.service';
import { REFRESH_TTL_MS } from './application/config-tokens';

import { COMPANY_REPOSITORY } from './domain/ports/company.repository';
import { USER_REPOSITORY } from './domain/ports/user.repository';
import { REFRESH_TOKEN_REPOSITORY } from './domain/ports/refresh-token.repository';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { TOKEN_SERVICE } from './domain/ports/token-service.port';
import { UNIT_OF_WORK } from './domain/ports/unit-of-work.port';
import { RBAC_REPOSITORY } from './domain/ports/rbac.repository';
import { GOOGLE_VERIFIER } from './domain/ports/google-verifier.port';

import { PrismaCompanyRepository } from './infrastructure/persistence/prisma-company.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository';
import { PrismaRbacRepository } from './infrastructure/persistence/prisma-rbac.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { GoogleTokenInfoVerifier } from './infrastructure/security/google-tokeninfo-verifier';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, RolesController],
  providers: [
    SignUpUseCase,
    SignInUseCase,
    RefreshTokenUseCase,
    GetMeUseCase,
    LogoutUseCase,
    ListRolesUseCase,
    GoogleSignInUseCase,
    IssueTokensService,
    JwtAuthGuard,
    PermissionsGuard,

    // Ports -> Adapters
    { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: RBAC_REPOSITORY, useClass: PrismaRbacRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: GOOGLE_VERIFIER, useClass: GoogleTokenInfoVerifier },
    { provide: UNIT_OF_WORK, useExisting: PrismaService },
    {
      provide: REFRESH_TTL_MS,
      useFactory: (config: ConfigService) =>
        parseDurationMs(config.get<string>('JWT_REFRESH_TTL') ?? '7d'),
      inject: [ConfigService],
    },
  ],
})
export class IamModule {}
