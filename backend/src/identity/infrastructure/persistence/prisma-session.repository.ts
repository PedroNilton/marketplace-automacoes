import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaExecutionContext } from '../../../infrastructure/database/prisma-execution-context';
import { PrismaRepository } from '../../../infrastructure/database/prisma-repository';
import {
  CreateSessionInput,
  SessionRepository,
  TouchSessionInput,
} from '../../application/ports/session-repository';
import {
  ResolvedSession,
  Session,
  SessionRevokeReason,
} from '../../domain/session';
import { PrismaSessionMapper } from './prisma-session.mapper';

@Injectable()
export class PrismaSessionRepository
  extends PrismaRepository
  implements SessionRepository
{
  constructor(context: PrismaExecutionContext) {
    super(context);
  }

  create(input: CreateSessionInput): Promise<Session> {
    return this.execute(async (client) => {
      const session = await client.session.create({
        data: {
          userId: input.userId,
          tokenDigest: input.tokenDigest,
          csrfDigest: input.csrfDigest,
          createdAt: input.createdAt,
          lastSeenAt: input.createdAt,
          idleExpiresAt: input.idleExpiresAt,
          absoluteExpiresAt: input.absoluteExpiresAt,
        },
      });

      return PrismaSessionMapper.toDomain(session);
    });
  }

  resolve(
    tokenDigest: string,
    resolvedAt: Date,
  ): Promise<ResolvedSession | null> {
    return this.execute(async (client) => {
      const session = await client.session.findFirst({
        where: {
          tokenDigest,
          revokedAt: null,
          idleExpiresAt: { gt: resolvedAt },
          absoluteExpiresAt: { gt: resolvedAt },
          user: { status: 'ACTIVE' },
        },
        include: {
          user: {
            select: {
              id: true,
              emailVerifiedAt: true,
              platformRole: true,
            },
          },
        },
      });

      if (!session) {
        return null;
      }

      return {
        session: PrismaSessionMapper.toDomain(session),
        identity: {
          userId: session.user.id,
          emailVerifiedAt: session.user.emailVerifiedAt,
          platformRole: session.user.platformRole,
        },
      };
    });
  }

  touch(input: TouchSessionInput): Promise<boolean> {
    return this.execute(async (client) => {
      const affected = await client.$executeRaw(Prisma.sql`
        UPDATE sessions AS session
        SET
          last_seen_at = ${input.touchedAt},
          idle_expires_at = LEAST(
            ${input.idleExpiresAt},
            session.absolute_expires_at
          )
        FROM users AS account
        WHERE session.user_id = account.id
          AND session.token_digest = ${input.tokenDigest}
          AND session.revoked_at IS NULL
          AND session.last_seen_at <= ${input.touchIfLastSeenBefore}
          AND session.idle_expires_at > ${input.touchedAt}
          AND session.absolute_expires_at > ${input.touchedAt}
          AND account.status = 'ACTIVE'::user_status
      `);

      return affected === 1;
    });
  }

  revoke(
    tokenDigest: string,
    revokedAt: Date,
    reason: SessionRevokeReason,
  ): Promise<boolean> {
    return this.execute(async (client) => {
      const result = await client.session.updateMany({
        where: { tokenDigest, revokedAt: null },
        data: { revokedAt, revokeReason: reason },
      });

      return result.count === 1;
    });
  }

  revokeAllForUser(
    userId: string,
    revokedAt: Date,
    reason: SessionRevokeReason,
  ): Promise<number> {
    return this.execute(async (client) => {
      const result = await client.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt, revokeReason: reason },
      });

      return result.count;
    });
  }
}
