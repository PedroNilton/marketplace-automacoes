import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../../config/application-config.module';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { AuthTokenRepository } from '../../application/ports/auth-token-repository';
import { CsrfTokenDeriver } from '../../application/ports/csrf-token-deriver';
import { RateLimitKeyDigester } from '../../application/ports/rate-limit-key-digester';
import { RateLimitRepository } from '../../application/ports/rate-limit-repository';
import { SessionRepository } from '../../application/ports/session-repository';
import { UserRepository } from '../../application/ports/user-repository';
import { PrismaAuthTokenRepository } from './prisma-auth-token.repository';
import { PrismaRateLimitRepository } from './prisma-rate-limit.repository';
import { PrismaSessionRepository } from './prisma-session.repository';
import { PrismaUserRepository } from './prisma-user.repository';
import { HmacRateLimitKeyDigester } from '../security/hmac-rate-limit-key-digester';
import { HmacCsrfTokenDeriver } from '../security/hmac-csrf-token-deriver';

@Module({
  imports: [ApplicationConfigModule, PrismaModule],
  providers: [
    PrismaUserRepository,
    PrismaAuthTokenRepository,
    PrismaSessionRepository,
    PrismaRateLimitRepository,
    HmacRateLimitKeyDigester,
    HmacCsrfTokenDeriver,
    {
      provide: UserRepository,
      useExisting: PrismaUserRepository,
    },
    {
      provide: AuthTokenRepository,
      useExisting: PrismaAuthTokenRepository,
    },
    {
      provide: SessionRepository,
      useExisting: PrismaSessionRepository,
    },
    {
      provide: RateLimitKeyDigester,
      useExisting: HmacRateLimitKeyDigester,
    },
    {
      provide: CsrfTokenDeriver,
      useExisting: HmacCsrfTokenDeriver,
    },
    {
      provide: RateLimitRepository,
      useExisting: PrismaRateLimitRepository,
    },
  ],
  exports: [
    UserRepository,
    AuthTokenRepository,
    SessionRepository,
    CsrfTokenDeriver,
    RateLimitKeyDigester,
    RateLimitRepository,
    PrismaModule,
  ],
})
export class IdentityPersistenceModule {}
