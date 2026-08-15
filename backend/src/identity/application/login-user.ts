import { TransactionManager } from '../../application/ports/transaction-manager';
import { EmailAddress } from '../domain/email-address';
import { InternalReturnPath } from '../domain/internal-return-path';
import { RateLimitKeyScope, RateLimitState } from '../domain/rate-limit';
import { AccountUnavailableError } from './errors/account-unavailable.error';
import { InvalidLoginCredentialsError } from './errors/invalid-login-credentials.error';
import { LoginRateLimitExceededError } from './errors/login-rate-limit-exceeded.error';
import { Clock } from './ports/clock';
import { PasswordHasher } from './ports/password-hasher';
import { RateLimitKeyDigester } from './ports/rate-limit-key-digester';
import { RateLimitRepository } from './ports/rate-limit-repository';
import { SecureTokenGenerator } from './ports/secure-token-generator';
import { SessionRepository } from './ports/session-repository';
import { TokenDigester } from './ports/token-digester';
import { UserRepository } from './ports/user-repository';
import { RateLimitDecisions } from './rate-limit-decisions';

const RESTRICTED_SESSION_RETURN_PATH = '/verificar-email';

export interface LoginUserInput {
  readonly email: string;
  readonly password: string;
  readonly returnTo?: string | null;
  readonly originIdentifier: string;
}

export interface LoginUserOptions {
  readonly sessionAbsoluteTtlSeconds: number;
  readonly sessionIdleTtlSeconds: number;
  readonly dummyPasswordHash: string;
  readonly rateLimit: {
    readonly windowDurationSeconds: number;
    readonly maximumAttempts: number;
    readonly blockDurationSeconds: number;
  };
}

export interface LoginUserResult {
  readonly user: {
    readonly id: string;
    readonly displayName: string;
    readonly emailVerified: boolean;
    readonly platformRole: 'MEMBER' | 'ADMIN';
  };
  readonly session: {
    readonly token: string;
    readonly csrfToken: string;
    readonly restricted: boolean;
    readonly returnTo: string;
    readonly idleExpiresAt: Date;
    readonly absoluteExpiresAt: Date;
  };
}

export interface LoginUserDependencies {
  readonly users: UserRepository;
  readonly sessions: SessionRepository;
  readonly transactions: TransactionManager;
  readonly passwordHasher: PasswordHasher;
  readonly secureTokens: SecureTokenGenerator;
  readonly tokenDigester: TokenDigester;
  readonly rateLimits: RateLimitRepository;
  readonly rateLimitKeyDigester: RateLimitKeyDigester;
  readonly rateLimitDecisions: RateLimitDecisions;
  readonly clock: Clock;
}

export class LoginUser {
  constructor(
    private readonly dependencies: LoginUserDependencies,
    private readonly options: LoginUserOptions,
  ) {
    assertOptions(options);
  }

  async execute(input: LoginUserInput): Promise<LoginUserResult> {
    const origin = normalizeOrigin(input.originIdentifier);
    const email = parseEmail(input.email);
    const attemptedAt = this.dependencies.clock.now();
    const rateLimitIdentifiers = this.rateLimitIdentifiers(
      input.email,
      email,
      origin,
    );

    await this.enforceRateLimit(rateLimitIdentifiers, attemptedAt);

    const user = email
      ? await this.dependencies.users.findByEmail(email)
      : null;
    const passwordMatches = await this.dependencies.passwordHasher.verify(
      user?.passwordHash ?? this.options.dummyPasswordHash,
      input.password,
    );

    if (!user || !passwordMatches) {
      throw new InvalidLoginCredentialsError();
    }

    if (user.status !== 'ACTIVE') {
      throw new AccountUnavailableError();
    }

    const token = this.dependencies.secureTokens.generate();
    const csrfToken = this.dependencies.secureTokens.generate();
    const absoluteExpiresAt = addSeconds(
      attemptedAt,
      this.options.sessionAbsoluteTtlSeconds,
    );
    const idleExpiresAt = addSeconds(
      attemptedAt,
      this.options.sessionIdleTtlSeconds,
    );

    await this.dependencies.transactions.run(async () => {
      await this.dependencies.sessions.create({
        userId: user.id,
        tokenDigest: this.dependencies.tokenDigester.digest(token),
        csrfDigest: this.dependencies.tokenDigester.digest(csrfToken),
        createdAt: attemptedAt,
        idleExpiresAt,
        absoluteExpiresAt,
      });

      for (const [scope, identifier] of rateLimitIdentifiers) {
        await this.dependencies.rateLimits.reset(
          'LOGIN',
          this.dependencies.rateLimitKeyDigester.digest(
            'LOGIN',
            scope,
            identifier,
          ),
        );
      }
    });

    const restricted = user.emailVerifiedAt === null;

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        emailVerified: !restricted,
        platformRole: user.platformRole,
      },
      session: {
        token,
        csrfToken,
        restricted,
        returnTo: restricted
          ? RESTRICTED_SESSION_RETURN_PATH
          : InternalReturnPath.resolve(input.returnTo),
        idleExpiresAt,
        absoluteExpiresAt,
      },
    };
  }

  private rateLimitIdentifiers(
    rawEmail: string,
    email: EmailAddress | null,
    origin: string,
  ): ReadonlyArray<readonly [RateLimitKeyScope, string]> {
    return [
      ['ACCOUNT', email?.value ?? normalizeInvalidEmail(rawEmail)],
      ['ORIGIN', origin],
    ];
  }

  private async enforceRateLimit(
    identifiers: ReadonlyArray<readonly [RateLimitKeyScope, string]>,
    attemptedAt: Date,
  ): Promise<void> {
    for (const [scope, identifier] of identifiers) {
      const state = await this.dependencies.rateLimits.registerAttempt({
        action: 'LOGIN',
        keyDigest: this.dependencies.rateLimitKeyDigester.digest(
          'LOGIN',
          scope,
          identifier,
        ),
        attemptedAt,
        ...this.options.rateLimit,
      });

      this.throwIfLimited(state);
    }
  }

  private throwIfLimited(state: RateLimitState): void {
    const retryAfterSeconds =
      this.dependencies.rateLimitDecisions.evaluate(state).retryAfterSeconds ??
      0;

    if (retryAfterSeconds > 0) {
      throw new LoginRateLimitExceededError(retryAfterSeconds);
    }
  }
}

function parseEmail(value: string): EmailAddress | null {
  try {
    return EmailAddress.create(value);
  } catch {
    return null;
  }
}

function normalizeInvalidEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, EmailAddress.maxLength);
}

function normalizeOrigin(value: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RangeError('originIdentifier must not be empty.');
  }

  return normalized;
}

function addSeconds(value: Date, seconds: number): Date {
  return new Date(value.getTime() + seconds * 1_000);
}

function assertOptions(options: LoginUserOptions): void {
  const positiveIntegers = [
    options.sessionAbsoluteTtlSeconds,
    options.sessionIdleTtlSeconds,
    options.rateLimit.windowDurationSeconds,
    options.rateLimit.maximumAttempts,
    options.rateLimit.blockDurationSeconds,
  ];

  if (
    positiveIntegers.some((value) => !Number.isInteger(value) || value <= 0)
  ) {
    throw new RangeError('Login options must be positive integers.');
  }

  if (options.sessionIdleTtlSeconds > options.sessionAbsoluteTtlSeconds) {
    throw new RangeError(
      'The session idle TTL must not exceed its absolute TTL.',
    );
  }

  if (options.dummyPasswordHash.trim().length === 0) {
    throw new RangeError('The dummy password hash must not be empty.');
  }
}
