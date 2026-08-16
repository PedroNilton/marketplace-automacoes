import { ResolvedSession } from '../domain/session';
import { AuthenticationRequiredError } from './errors/authentication-required.error';
import { Clock } from './ports/clock';
import { CsrfTokenDeriver } from './ports/csrf-token-deriver';
import { SessionRepository } from './ports/session-repository';
import { TokenDigester } from './ports/token-digester';

const SESSION_TOKEN_PATTERN = /^[A-Za-z\d_-]{43}$/;

export interface GetCurrentIdentityInput {
  readonly sessionToken: string | null | undefined;
}

export interface GetCurrentIdentityOptions {
  readonly sessionIdleTtlSeconds: number;
  readonly activityTouchIntervalSeconds: number;
}

export interface GetCurrentIdentityResult {
  readonly user: {
    readonly id: string;
    readonly displayName: string;
    readonly emailVerified: boolean;
    readonly platformRole: 'MEMBER' | 'ADMIN';
  };
  readonly session: {
    readonly restricted: boolean;
    readonly csrfToken: string;
  };
}

export interface GetCurrentIdentityDependencies {
  readonly sessions: SessionRepository;
  readonly csrfTokens: CsrfTokenDeriver;
  readonly tokenDigester: TokenDigester;
  readonly clock: Clock;
}

export class GetCurrentIdentity {
  constructor(
    private readonly dependencies: GetCurrentIdentityDependencies,
    private readonly options: GetCurrentIdentityOptions,
  ) {
    assertOptions(options);
  }

  async execute(
    input: GetCurrentIdentityInput,
  ): Promise<GetCurrentIdentityResult> {
    const sessionToken = requireSessionToken(input.sessionToken);
    const resolvedAt = this.dependencies.clock.now();
    const tokenDigest = this.dependencies.tokenDigester.digest(sessionToken);
    let resolved = await this.dependencies.sessions.resolve(
      tokenDigest,
      resolvedAt,
    );

    if (!resolved) {
      throw new AuthenticationRequiredError();
    }

    const csrfToken = this.dependencies.csrfTokens.derive(sessionToken);
    this.requireMatchingCsrf(csrfToken, resolved);

    if (this.shouldTouch(resolved, resolvedAt)) {
      const touched = await this.dependencies.sessions.touch({
        tokenDigest,
        touchedAt: resolvedAt,
        touchIfLastSeenBefore: new Date(
          resolvedAt.getTime() -
            this.options.activityTouchIntervalSeconds * 1_000,
        ),
        idleExpiresAt: new Date(
          resolvedAt.getTime() + this.options.sessionIdleTtlSeconds * 1_000,
        ),
      });

      if (!touched) {
        resolved = await this.dependencies.sessions.resolve(
          tokenDigest,
          resolvedAt,
        );

        if (!resolved) {
          throw new AuthenticationRequiredError();
        }

        this.requireMatchingCsrf(csrfToken, resolved);
      }
    }

    const restricted = resolved.identity.emailVerifiedAt === null;

    return {
      user: {
        id: resolved.identity.userId,
        displayName: resolved.identity.displayName,
        emailVerified: !restricted,
        platformRole: resolved.identity.platformRole,
      },
      session: { restricted, csrfToken },
    };
  }

  private shouldTouch(resolved: ResolvedSession, resolvedAt: Date): boolean {
    const threshold =
      resolvedAt.getTime() - this.options.activityTouchIntervalSeconds * 1_000;

    return resolved.session.lastSeenAt.getTime() <= threshold;
  }

  private requireMatchingCsrf(
    csrfToken: string,
    resolved: ResolvedSession,
  ): void {
    if (
      !this.dependencies.tokenDigester.matches(
        csrfToken,
        resolved.session.csrfDigest,
      )
    ) {
      throw new AuthenticationRequiredError();
    }
  }
}

function requireSessionToken(value: string | null | undefined): string {
  if (!value || !SESSION_TOKEN_PATTERN.test(value)) {
    throw new AuthenticationRequiredError();
  }

  return value;
}

function assertOptions(options: GetCurrentIdentityOptions): void {
  const values = [
    options.sessionIdleTtlSeconds,
    options.activityTouchIntervalSeconds,
  ];

  if (values.some((value) => !Number.isInteger(value) || value <= 0)) {
    throw new RangeError('Current identity options must be positive integers.');
  }

  if (options.activityTouchIntervalSeconds > options.sessionIdleTtlSeconds) {
    throw new RangeError(
      'The activity touch interval must not exceed the session idle TTL.',
    );
  }
}
