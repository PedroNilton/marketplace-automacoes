import { TransactionManager } from '../../application/ports/transaction-manager';
import { EmailAddress } from '../domain/email-address';
import { RateLimitKeyScope, RateLimitState } from '../domain/rate-limit';
import { PasswordResetRateLimitExceededError } from './errors/password-reset-rate-limit-exceeded.error';
import { AuthTokenRepository } from './ports/auth-token-repository';
import { Clock } from './ports/clock';
import { RateLimitKeyDigester } from './ports/rate-limit-key-digester';
import { RateLimitRepository } from './ports/rate-limit-repository';
import { SecureTokenGenerator } from './ports/secure-token-generator';
import { TokenDigester } from './ports/token-digester';
import { UserRepository } from './ports/user-repository';
import { RateLimitDecisions } from './rate-limit-decisions';

export interface RequestPasswordResetInput {
  readonly email: string;
  readonly originIdentifier: string;
}

export interface RequestPasswordResetOptions {
  readonly resetTokenTtlSeconds: number;
  readonly maximumAttemptsPerHour: number;
  readonly hourlyWindowDurationSeconds: number;
}

export interface PasswordResetDeliveryRequest {
  readonly recipient: string;
  readonly displayName: string;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface RequestPasswordResetResult {
  readonly accepted: true;
  readonly reset: PasswordResetDeliveryRequest | null;
}

export interface RequestPasswordResetDependencies {
  readonly users: UserRepository;
  readonly authTokens: AuthTokenRepository;
  readonly transactions: TransactionManager;
  readonly secureTokens: SecureTokenGenerator;
  readonly tokenDigester: TokenDigester;
  readonly rateLimits: RateLimitRepository;
  readonly rateLimitKeyDigester: RateLimitKeyDigester;
  readonly rateLimitDecisions: RateLimitDecisions;
  readonly clock: Clock;
}

export class RequestPasswordReset {
  constructor(
    private readonly dependencies: RequestPasswordResetDependencies,
    private readonly options: RequestPasswordResetOptions,
  ) {
    assertOptions(options);
  }

  async execute(
    input: RequestPasswordResetInput,
  ): Promise<RequestPasswordResetResult> {
    const email = EmailAddress.create(input.email);
    const origin = normalizeOrigin(input.originIdentifier);
    const requestedAt = this.dependencies.clock.now();

    await this.enforceRateLimits(email, origin, requestedAt);

    return this.dependencies.transactions.run(async () => {
      const user = await this.dependencies.users.findByEmail(email);

      if (!user) {
        return neutralResult();
      }

      const token = this.dependencies.secureTokens.generate();
      const expiresAt = new Date(
        requestedAt.getTime() + this.options.resetTokenTtlSeconds * 1_000,
      );
      await this.dependencies.authTokens.issue({
        userId: user.id,
        purpose: 'PASSWORD_RESET',
        tokenDigest: this.dependencies.tokenDigester.digest(token),
        createdAt: requestedAt,
        expiresAt,
      });

      return {
        accepted: true,
        reset: {
          recipient: email.value,
          displayName: user.displayName,
          token,
          expiresAt,
        },
      };
    });
  }

  private async enforceRateLimits(
    email: EmailAddress,
    origin: string,
    attemptedAt: Date,
  ): Promise<void> {
    const identifiers: ReadonlyArray<readonly [RateLimitKeyScope, string]> = [
      ['ACCOUNT', email.value],
      ['ORIGIN', origin],
    ];

    for (const [scope, identifier] of identifiers) {
      const state = await this.dependencies.rateLimits.registerAttempt({
        action: 'PASSWORD_RESET',
        keyDigest: this.dependencies.rateLimitKeyDigester.digest(
          'PASSWORD_RESET',
          scope,
          identifier,
        ),
        attemptedAt,
        windowDurationSeconds: this.options.hourlyWindowDurationSeconds,
        maximumAttempts: this.options.maximumAttemptsPerHour,
        blockDurationSeconds: this.options.hourlyWindowDurationSeconds,
      });

      this.throwIfLimited(state);
    }
  }

  private throwIfLimited(state: RateLimitState): void {
    const retryAfterSeconds =
      this.dependencies.rateLimitDecisions.evaluate(state).retryAfterSeconds ??
      0;

    if (retryAfterSeconds > 0) {
      throw new PasswordResetRateLimitExceededError(retryAfterSeconds);
    }
  }
}

function normalizeOrigin(value: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RangeError('originIdentifier must not be empty.');
  }

  return normalized;
}

function neutralResult(): RequestPasswordResetResult {
  return { accepted: true, reset: null };
}

function assertOptions(options: RequestPasswordResetOptions): void {
  const values = [
    options.resetTokenTtlSeconds,
    options.maximumAttemptsPerHour,
    options.hourlyWindowDurationSeconds,
  ];

  if (values.some((value) => !Number.isInteger(value) || value <= 0)) {
    throw new RangeError(
      'Password reset request options must be positive integers.',
    );
  }
}
