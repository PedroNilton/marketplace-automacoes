import { TransactionManager } from '../../application/ports/transaction-manager';
import { UniqueConstraintViolationError } from '../../application/errors/unique-constraint-violation.error';
import { EmailAddress } from '../domain/email-address';
import { PasswordPolicy } from '../domain/password-policy';
import { RateLimitDecisions } from './rate-limit-decisions';
import { AuthTokenRepository } from './ports/auth-token-repository';
import { Clock } from './ports/clock';
import { PasswordHasher } from './ports/password-hasher';
import { RateLimitKeyDigester } from './ports/rate-limit-key-digester';
import { RateLimitRepository } from './ports/rate-limit-repository';
import { SecureTokenGenerator } from './ports/secure-token-generator';
import { TokenDigester } from './ports/token-digester';
import { UserRepository } from './ports/user-repository';
import { IdentityEmailDelivery } from './ports/identity-email-delivery';
import { InvalidRegistrationInputError } from './errors/invalid-registration-input.error';
import { RegistrationRateLimitExceededError } from './errors/registration-rate-limit-exceeded.error';

const DISPLAY_NAME_MAXIMUM_LENGTH = 100;
const LEGAL_VERSION_MAXIMUM_LENGTH = 32;

export interface RegisterUserInput {
  readonly displayName: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirmation: string;
  readonly termsVersion: string;
  readonly privacyVersion: string;
  readonly originIdentifier: string;
}

export interface RegisterUserOptions {
  readonly currentTermsVersion: string;
  readonly currentPrivacyVersion: string;
  readonly verificationTokenTtlSeconds: number;
  readonly rateLimit: {
    readonly windowDurationSeconds: number;
    readonly maximumAttempts: number;
    readonly blockDurationSeconds: number;
  };
}

export interface RegistrationVerificationRequest {
  readonly recipient: string;
  readonly displayName: string;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface RegisterUserResult {
  readonly accepted: true;
  readonly verification: RegistrationVerificationRequest | null;
}

export interface RegisterUserDependencies {
  readonly users: UserRepository;
  readonly authTokens: AuthTokenRepository;
  readonly transactions: TransactionManager;
  readonly passwordPolicy: PasswordPolicy;
  readonly passwordHasher: PasswordHasher;
  readonly secureTokens: SecureTokenGenerator;
  readonly tokenDigester: TokenDigester;
  readonly rateLimits: RateLimitRepository;
  readonly rateLimitKeyDigester: RateLimitKeyDigester;
  readonly rateLimitDecisions: RateLimitDecisions;
  readonly clock: Clock;
  readonly emailDelivery: IdentityEmailDelivery;
}

export class RegisterUser {
  constructor(
    private readonly dependencies: RegisterUserDependencies,
    private readonly options: RegisterUserOptions,
  ) {
    assertOptions(options);
  }

  async execute(input: RegisterUserInput): Promise<RegisterUserResult> {
    const displayName = normalizeDisplayName(input.displayName);
    const email = EmailAddress.create(input.email);
    const termsVersion = acceptLegalVersion(
      input.termsVersion,
      this.options.currentTermsVersion,
      'TERMS_NOT_ACCEPTED',
    );
    const privacyVersion = acceptLegalVersion(
      input.privacyVersion,
      this.options.currentPrivacyVersion,
      'PRIVACY_NOT_ACCEPTED',
    );

    this.dependencies.passwordPolicy.validate(
      input.password,
      input.passwordConfirmation,
    );

    const attemptedAt = this.dependencies.clock.now();
    await this.enforceRateLimit(email, input.originIdentifier, attemptedAt);
    const passwordHash = await this.dependencies.passwordHasher.hash(
      input.password,
    );
    const token = this.dependencies.secureTokens.generate();
    const expiresAt = new Date(
      attemptedAt.getTime() + this.options.verificationTokenTtlSeconds * 1_000,
    );

    try {
      await this.dependencies.transactions.run(async () => {
        const user = await this.dependencies.users.create({
          displayName,
          email,
          passwordHash,
          termsVersion,
          privacyVersion,
          legalAcceptedAt: attemptedAt,
        });

        await this.dependencies.authTokens.issue({
          userId: user.id,
          purpose: 'EMAIL_VERIFICATION',
          tokenDigest: this.dependencies.tokenDigester.digest(token),
          createdAt: attemptedAt,
          expiresAt,
        });
      });
    } catch (error) {
      if (isDuplicateEmail(error)) {
        return neutralResult();
      }

      throw error;
    }

    const result: RegisterUserResult = {
      accepted: true,
      verification: {
        recipient: email.value,
        displayName,
        token,
        expiresAt,
      },
    };

    if (result.verification) {
      await this.dependencies.emailDelivery.sendEmailVerification(
        result.verification,
      );
    }

    return result;
  }

  private async enforceRateLimit(
    email: EmailAddress,
    originIdentifier: string,
    attemptedAt: Date,
  ): Promise<void> {
    const origin = originIdentifier.trim();

    if (origin.length === 0) {
      throw new RangeError('originIdentifier must not be empty.');
    }

    const identifiers = [
      ['ACCOUNT', email.value],
      ['ORIGIN', origin],
    ] as const;
    const states = await Promise.all(
      identifiers.map(([scope, identifier]) =>
        this.dependencies.rateLimits.registerAttempt({
          action: 'REGISTRATION',
          keyDigest: this.dependencies.rateLimitKeyDigester.digest(
            'REGISTRATION',
            scope,
            identifier,
          ),
          attemptedAt,
          ...this.options.rateLimit,
        }),
      ),
    );
    const decisions = states.map((state) =>
      this.dependencies.rateLimitDecisions.evaluate(state),
    );
    const retryAfterSeconds = Math.max(
      ...decisions.map((decision) => decision.retryAfterSeconds ?? 0),
    );

    if (retryAfterSeconds > 0) {
      throw new RegistrationRateLimitExceededError(retryAfterSeconds);
    }
  }
}

function normalizeDisplayName(value: string): string {
  const normalized = value.trim().replace(/\s+/gu, ' ');

  if (normalized.length === 0) {
    throw new InvalidRegistrationInputError('DISPLAY_NAME_EMPTY');
  }

  if (Array.from(normalized).length > DISPLAY_NAME_MAXIMUM_LENGTH) {
    throw new InvalidRegistrationInputError('DISPLAY_NAME_TOO_LONG');
  }

  return normalized;
}

function acceptLegalVersion(
  value: string,
  currentVersion: string,
  reason: 'TERMS_NOT_ACCEPTED' | 'PRIVACY_NOT_ACCEPTED',
): string {
  const normalized = value.trim();

  if (normalized !== currentVersion) {
    throw new InvalidRegistrationInputError(reason);
  }

  return normalized;
}

function assertOptions(options: RegisterUserOptions): void {
  const legalVersions = [
    options.currentTermsVersion,
    options.currentPrivacyVersion,
  ];

  if (
    legalVersions.some(
      (version) =>
        version.trim().length === 0 ||
        Array.from(version).length > LEGAL_VERSION_MAXIMUM_LENGTH,
    )
  ) {
    throw new RangeError(
      'Current legal versions must contain 1 to 32 characters.',
    );
  }

  const positiveIntegers = [
    options.verificationTokenTtlSeconds,
    options.rateLimit.windowDurationSeconds,
    options.rateLimit.maximumAttempts,
    options.rateLimit.blockDurationSeconds,
  ];

  if (
    positiveIntegers.some((value) => !Number.isInteger(value) || value <= 0)
  ) {
    throw new RangeError('Registration options must be positive integers.');
  }
}

function isDuplicateEmail(error: unknown): boolean {
  return (
    error instanceof UniqueConstraintViolationError &&
    (error.fields.length === 0 || error.fields.includes('email'))
  );
}

function neutralResult(): RegisterUserResult {
  return { accepted: true, verification: null };
}
