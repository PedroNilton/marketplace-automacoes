import { Injectable } from '@nestjs/common';
import {
  CreateUserAccountInput,
  UserRepository,
} from '../../application/ports/user-repository';
import { EmailAddress } from '../../domain/email-address';
import { UserAccount, UserStatus } from '../../domain/user-account';
import { PrismaExecutionContext } from '../../../infrastructure/database/prisma-execution-context';
import { PrismaRepository } from '../../../infrastructure/database/prisma-repository';
import { PrismaUserMapper } from './prisma-user.mapper';

@Injectable()
export class PrismaUserRepository
  extends PrismaRepository
  implements UserRepository
{
  constructor(context: PrismaExecutionContext) {
    super(context);
  }

  create(input: CreateUserAccountInput): Promise<UserAccount> {
    return this.execute(async (client) => {
      const user = await client.user.create({
        data: {
          displayName: input.displayName,
          email: input.email.value,
          passwordHash: input.passwordHash,
          termsVersion: input.termsVersion,
          privacyVersion: input.privacyVersion,
          legalAcceptedAt: input.legalAcceptedAt,
        },
      });

      return PrismaUserMapper.toDomain(user);
    });
  }

  findById(id: string): Promise<UserAccount | null> {
    return this.execute(async (client) => {
      const user = await client.user.findUnique({ where: { id } });

      return user ? PrismaUserMapper.toDomain(user) : null;
    });
  }

  findByEmail(email: EmailAddress): Promise<UserAccount | null> {
    return this.execute(async (client) => {
      const user = await client.user.findUnique({
        where: { email: email.value },
      });

      return user ? PrismaUserMapper.toDomain(user) : null;
    });
  }

  markEmailVerified(id: string, verifiedAt: Date): Promise<UserAccount | null> {
    return this.execute(async (client) => {
      await client.user.updateMany({
        where: { id, emailVerifiedAt: null },
        data: { emailVerifiedAt: verifiedAt },
      });

      const user = await client.user.findUnique({ where: { id } });

      return user ? PrismaUserMapper.toDomain(user) : null;
    });
  }

  updatePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<UserAccount | null> {
    return this.updateExisting(id, { passwordHash });
  }

  updateStatus(id: string, status: UserStatus): Promise<UserAccount | null> {
    return this.updateExisting(id, { status });
  }

  private updateExisting(
    id: string,
    data: { passwordHash: string } | { status: UserStatus },
  ): Promise<UserAccount | null> {
    return this.execute(async (client) => {
      const result = await client.user.updateMany({ where: { id }, data });

      if (result.count === 0) {
        return null;
      }

      const user = await client.user.findUnique({ where: { id } });

      return user ? PrismaUserMapper.toDomain(user) : null;
    });
  }
}
