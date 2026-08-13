import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { AuthTokenRepository } from '../../application/ports/auth-token-repository';
import { UserRepository } from '../../application/ports/user-repository';
import { PrismaAuthTokenRepository } from './prisma-auth-token.repository';
import { PrismaUserRepository } from './prisma-user.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaUserRepository,
    PrismaAuthTokenRepository,
    {
      provide: UserRepository,
      useExisting: PrismaUserRepository,
    },
    {
      provide: AuthTokenRepository,
      useExisting: PrismaAuthTokenRepository,
    },
  ],
  exports: [UserRepository, AuthTokenRepository],
})
export class IdentityPersistenceModule {}
