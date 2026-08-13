import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaExecutionContext } from '../../../infrastructure/database/prisma-execution-context';
import { PrismaRepository } from '../../../infrastructure/database/prisma-repository';
import {
  RateLimitRepository,
  RegisterRateLimitAttemptInput,
} from '../../application/ports/rate-limit-repository';
import { RateLimitAction, RateLimitState } from '../../domain/rate-limit';

interface RateLimitRow {
  action: RateLimitAction;
  keyDigest: string;
  windowStartedAt: Date;
  attemptCount: number;
  blockedUntil: Date | null;
  updatedAt: Date;
}

@Injectable()
export class PrismaRateLimitRepository
  extends PrismaRepository
  implements RateLimitRepository
{
  constructor(context: PrismaExecutionContext) {
    super(context);
  }

  registerAttempt(
    input: RegisterRateLimitAttemptInput,
  ): Promise<RateLimitState> {
    this.assertPositiveInteger(
      input.windowDurationSeconds,
      'windowDurationSeconds',
    );
    this.assertPositiveInteger(input.maximumAttempts, 'maximumAttempts');
    this.assertPositiveInteger(
      input.blockDurationSeconds,
      'blockDurationSeconds',
    );

    return this.execute(async (client) => {
      const rows = await client.$queryRaw<RateLimitRow[]>(Prisma.sql`
        INSERT INTO auth_rate_limits (
          action,
          key_digest,
          window_started_at,
          attempt_count,
          blocked_until,
          updated_at
        ) VALUES (
          ${input.action}::auth_rate_limit_action,
          ${input.keyDigest},
          ${input.attemptedAt},
          1,
          NULL,
          ${input.attemptedAt}
        )
        ON CONFLICT (action, key_digest) DO UPDATE
        SET
          window_started_at = CASE
            WHEN auth_rate_limits.window_started_at
              + make_interval(secs => ${input.windowDurationSeconds})
              <= ${input.attemptedAt}
              OR (
                auth_rate_limits.blocked_until IS NOT NULL
                AND auth_rate_limits.blocked_until <= ${input.attemptedAt}
              )
            THEN ${input.attemptedAt}
            ELSE auth_rate_limits.window_started_at
          END,
          attempt_count = CASE
            WHEN auth_rate_limits.blocked_until > ${input.attemptedAt}
            THEN auth_rate_limits.attempt_count
            WHEN auth_rate_limits.window_started_at
              + make_interval(secs => ${input.windowDurationSeconds})
              <= ${input.attemptedAt}
              OR (
                auth_rate_limits.blocked_until IS NOT NULL
                AND auth_rate_limits.blocked_until <= ${input.attemptedAt}
              )
            THEN 1
            ELSE auth_rate_limits.attempt_count + 1
          END,
          blocked_until = CASE
            WHEN auth_rate_limits.blocked_until > ${input.attemptedAt}
            THEN auth_rate_limits.blocked_until
            WHEN auth_rate_limits.window_started_at
              + make_interval(secs => ${input.windowDurationSeconds})
              <= ${input.attemptedAt}
              OR (
                auth_rate_limits.blocked_until IS NOT NULL
                AND auth_rate_limits.blocked_until <= ${input.attemptedAt}
              )
            THEN NULL
            WHEN auth_rate_limits.attempt_count + 1 > ${input.maximumAttempts}
            THEN ${input.attemptedAt}
              + make_interval(secs => ${input.blockDurationSeconds})
            ELSE NULL
          END,
          updated_at = ${input.attemptedAt}
        RETURNING
          action,
          key_digest AS "keyDigest",
          window_started_at AS "windowStartedAt",
          attempt_count AS "attemptCount",
          blocked_until AS "blockedUntil",
          updated_at AS "updatedAt"
      `);

      const state = rows[0];

      if (!state) {
        throw new Error(
          'Rate limit state was not returned after registration.',
        );
      }

      return state;
    });
  }

  reset(action: RateLimitAction, keyDigest: string): Promise<boolean> {
    return this.execute(async (client) => {
      const result = await client.authRateLimit.deleteMany({
        where: { action, keyDigest },
      });

      return result.count === 1;
    });
  }

  private assertPositiveInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new RangeError(`${field} must be a positive integer.`);
    }
  }
}
