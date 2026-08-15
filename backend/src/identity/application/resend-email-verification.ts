import { TransactionManager } from '../../application/ports/transaction-manager';
import { EmailAddress } from '../domain/email-address';
import { RateLimitKeyScope, RateLimitState } from '../domain/rate-limit';
import { UserAccount } from '../domain/user-account';
import { EmailVerificationResendRateLimitExceededError } from './errors/email-verification-resend-rate-limit-exceeded.error';
import { AuthTokenRepository } from './ports/auth-token-repository';
import { Clock } from './ports/clock';
import { RateLimitKeyDigester } from './ports/rate-limit-key-digester';
import { RateLimitRepository } from './ports/rate-limit-repository';
import { SecureTokenGenerator } from './ports/secure-token-generator';
import { TokenDigester } from './ports/token-digester';
import { UserRepository } from './ports/user-repository';
import { RateLimitDecisions } from './rate-limit-decisions';

export interface ResendEmailVerificationInput {
  readonly email: string;
  readonly originIdentifier: string;
}

export interface ResendEmailVerificationOptions {
  readonly verificationTokenTtlSeconds: number;
  readonly cooldownSeconds: number;
  readonly maximumAttemptsPerDay: number;
  readonly dailyWindowDurationSeconds: number;
}

export interface ResentEmailVerificationRequest {
  readonly recipient: string;
  readonly displayName: string;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface ResendEmailVerificationResult {
  readonly accepted: true;
  readonly verification: ResentEmailVerificationRequest | null;
}

export interface ResendEmailVerificationDependencies {
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

export class ResendEmailVerification {
  constructor(
    private readonly dependencies: ResendEmailVerificationDependencies,
    private readonly options: ResendEmailVerificationOptions,
  ) {
    assertOptions(options);
  }

  async execute(
    input: ResendEmailVerificationInput,
  ): Promise<ResendEmailVerificationResult> {
    const email = EmailAddress.create(input.email);
    const origin = input.originIdentifier.trim();

    if (origin.length === 0) {
      throw new RangeError('originIdentifier must not be empty.');
    }

    const requestedAt = this.dependencies.clock.now();
    await this.enforceRateLimits(email, origin, requestedAt);

    return this.dependencies.transactions.run(async () => {
      const user = await this.dependencies.users.findByEmail(email);

      if (!isEligible(user)) {
        return neutralResult();
      }

      const latestToken = await this.dependencies.authTokens.findLatest(
        user.id,
        'EMAIL_VERIFICATION',
      );

      if (
        latestToken &&
        latestToken.createdAt.getTime() + this.options.cooldownSeconds * 1_000 >
          requestedAt.getTime()
      ) {
        return neutralResult();
      }

      const token = this.dependencies.secureTokens.generate();
      const expiresAt = new Date(
        requestedAt.getTime() +
          this.options.verificationTokenTtlSeconds * 1_000,
      );
      await this.dependencies.authTokens.issue({
        userId: user.id,
        purpose: 'EMAIL_VERIFICATION',
        tokenDigest: this.dependencies.tokenDigester.digest(token),
        createdAt: requestedAt,
        expiresAt,
      });

      return {
        accepted: true,
        verification: {
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
    await this.enforceRateLimitGroup(
      'cooldown',
      email,
      origin,
      attemptedAt,
      this.options.cooldownSeconds,
      1,
      this.options.cooldownSeconds,
    );
    await this.enforceRateLimitGroup(
      'daily',
      email,
      origin,
      attemptedAt,
      this.options.dailyWindowDurationSeconds,
      this.options.maximumAttemptsPerDay,
      this.options.dailyWindowDurationSeconds,
    );
  }

  private async enforceRateLimitGroup(
    namespace: 'cooldown' | 'daily',
    email: EmailAddress,
    origin: string,
    attemptedAt: Date,
    windowDurationSeconds: number,
    maximumAttempts: number,
    blockDurationSeconds: number,
  ): Promise<void> {
    const identifiers: ReadonlyArray<readonly [RateLimitKeyScope, string]> = [
      ['ACCOUNT', email.value],
      ['ORIGIN', origin],
    ];
    const states = await Promise.all(
      identifiers.map(([scope, identifier]) =>
        this.dependencies.rateLimits.registerAttempt({
          action: 'EMAIL_RESEND',
          keyDigest: this.dependencies.rateLimitKeyDigester.digest(
            'EMAIL_RESEND',
            scope,
            `${namespace}:${identifier}`,
          ),
          attemptedAt,
          windowDurationSeconds,
          maximumAttempts,
          blockDurationSeconds,
        }),
      ),
    );

    this.throwIfLimited(states);
  }

  private throwIfLimited(states: readonly RateLimitState[]): void {
    const retryAfterSeconds = Math.max(
      ...states.map(
        (state) =>
          this.dependencies.rateLimitDecisions.evaluate(state)
            .retryAfterSeconds ?? 0,
      ),
    );

    if (retryAfterSeconds > 0) {
      throw new EmailVerificationResendRateLimitExceededError(
        retryAfterSeconds,
      );
    }
  }
}

function isEligible(user: UserAccount | null): user is UserAccount {
  return (
    user !== null && user.status === 'ACTIVE' && user.emailVerifiedAt === null
  );
}

function neutralResult(): ResendEmailVerificationResult {
  return { accepted: true, verification: null };
}

function assertOptions(options: ResendEmailVerificationOptions): void {
  const values = [
    options.verificationTokenTtlSeconds,
    options.cooldownSeconds,
    options.maximumAttemptsPerDay,
    options.dailyWindowDurationSeconds,
  ];

  if (values.some((value) => !Number.isInteger(value) || value <= 0)) {
    throw new RangeError(
      'Email verification resend options must be positive integers.',
    );
  }
}
