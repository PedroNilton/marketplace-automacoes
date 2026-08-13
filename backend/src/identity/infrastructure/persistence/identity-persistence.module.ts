import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { AuthTokenRepository } from '../../application/ports/auth-token-repository';
import { RateLimitKeyDigester } from '../../application/ports/rate-limit-key-digester';
import { SessionRepository } from '../../application/ports/session-repository';
import { UserRepository } from '../../application/ports/user-repository';
import { PrismaAuthTokenRepository } from './prisma-auth-token.repository';
import { PrismaSessionRepository } from './prisma-session.repository';
import { PrismaUserRepository } from './prisma-user.repository';
import { HmacRateLimitKeyDigester } from '../security/hmac-rate-limit-key-digester';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaUserRepository,
    PrismaAuthTokenRepository,
    PrismaSessionRepository,
    HmacRateLimitKeyDigester,
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
  ],
  exports: [
    UserRepository,
    AuthTokenRepository,
    SessionRepository,
    RateLimitKeyDigester,
  ],
})
export class IdentityPersistenceModule {}
