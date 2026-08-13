import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { AuthTokenRepository } from '../../application/ports/auth-token-repository';
import { SessionRepository } from '../../application/ports/session-repository';
import { UserRepository } from '../../application/ports/user-repository';
import { PrismaAuthTokenRepository } from './prisma-auth-token.repository';
import { PrismaSessionRepository } from './prisma-session.repository';
import { PrismaUserRepository } from './prisma-user.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaUserRepository,
    PrismaAuthTokenRepository,
    PrismaSessionRepository,
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
  ],
  exports: [UserRepository, AuthTokenRepository, SessionRepository],
})
export class IdentityPersistenceModule {}
