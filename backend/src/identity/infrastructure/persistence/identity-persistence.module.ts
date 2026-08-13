import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { UserRepository } from '../../application/ports/user-repository';
import { PrismaUserRepository } from './prisma-user.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaUserRepository,
    {
      provide: UserRepository,
      useExisting: PrismaUserRepository,
    },
  ],
  exports: [UserRepository],
})
export class IdentityPersistenceModule {}
