import { Injectable } from '@nestjs/common';
import {
  AuthTokenRepository,
  ConsumeAuthTokenInput,
  IssueAuthTokenInput,
} from '../../application/ports/auth-token-repository';
import { AuthToken, AuthTokenPurpose } from '../../domain/auth-token';
import { PrismaExecutionContext } from '../../../infrastructure/database/prisma-execution-context';
import { PrismaRepository } from '../../../infrastructure/database/prisma-repository';
import { PrismaAuthTokenMapper } from './prisma-auth-token.mapper';

@Injectable()
export class PrismaAuthTokenRepository
  extends PrismaRepository
  implements AuthTokenRepository
{
  constructor(context: PrismaExecutionContext) {
    super(context);
  }

  issue(input: IssueAuthTokenInput): Promise<AuthToken> {
    return this.context.runInTransaction(async () => {
      await this.invalidatePending(
        input.userId,
        input.purpose,
        input.createdAt,
      );

      return this.execute(async (client) => {
        const token = await client.authToken.create({
          data: {
            userId: input.userId,
            purpose: input.purpose,
            tokenDigest: input.tokenDigest,
            createdAt: input.createdAt,
            expiresAt: input.expiresAt,
          },
        });

        return PrismaAuthTokenMapper.toDomain(token);
      });
    });
  }

  consume(input: ConsumeAuthTokenInput): Promise<AuthToken | null> {
    return this.execute(async (client) => {
      const result = await client.authToken.updateMany({
        where: {
          purpose: input.purpose,
          tokenDigest: input.tokenDigest,
          consumedAt: null,
          invalidatedAt: null,
          expiresAt: { gt: input.consumedAt },
        },
        data: { consumedAt: input.consumedAt },
      });

      if (result.count !== 1) {
        return null;
      }

      const token = await client.authToken.findUnique({
        where: { tokenDigest: input.tokenDigest },
      });

      return token ? PrismaAuthTokenMapper.toDomain(token) : null;
    });
  }

  invalidatePending(
    userId: string,
    purpose: AuthTokenPurpose,
    invalidatedAt: Date,
  ): Promise<number> {
    return this.execute(async (client) => {
      const result = await client.authToken.updateMany({
        where: {
          userId,
          purpose,
          consumedAt: null,
          invalidatedAt: null,
        },
        data: { invalidatedAt },
      });

      return result.count;
    });
  }
}
