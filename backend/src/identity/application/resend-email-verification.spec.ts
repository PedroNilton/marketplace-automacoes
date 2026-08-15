/* eslint-disable @typescript-eslint/unbound-method */
import { TransactionManager } from '../../application/ports/transaction-manager';
import { AuthToken } from '../domain/auth-token';
import { EmailAddress } from '../domain/email-address';
import { RateLimitState } from '../domain/rate-limit';
import { UserAccount, UserStatus } from '../domain/user-account';
import { EmailVerificationResendRateLimitExceededError } from './errors/email-verification-resend-rate-limit-exceeded.error';
import { AuthTokenRepository } from './ports/auth-token-repository';
import { RateLimitRepository } from './ports/rate-limit-repository';
import { UserRepository } from './ports/user-repository';
import { RateLimitDecisions } from './rate-limit-decisions';
import {
  ResendEmailVerification,
  ResendEmailVerificationDependencies,
  ResendEmailVerificationInput,
  ResendEmailVerificationOptions,
} from './resend-email-verification';

describe('ResendEmailVerification', () => {
  const now = new Date('2026-08-15T18:00:00.000Z');
  const rawToken = 'resent-verification-token';
  const tokenDigest = 'd'.repeat(64);
  const options: ResendEmailVerificationOptions = {
    verificationTokenTtlSeconds: 86_400,
    cooldownSeconds: 60,
    maximumAttemptsPerDay: 5,
    dailyWindowDurationSeconds: 86_400,
  };

  let dependencies: ResendEmailVerificationDependencies;
  let users: jest.Mocked<UserRepository>;
  let authTokens: jest.Mocked<AuthTokenRepository>;
  let transactions: jest.Mocked<TransactionManager>;
  let rateLimits: jest.Mocked<RateLimitRepository>;

  beforeEach(() => {
    users = portMock<UserRepository>();
    authTokens = portMock<AuthTokenRepository>();
    transactions = portMock<TransactionManager>();
    rateLimits = portMock<RateLimitRepository>();
    const clock = { now: jest.fn(() => new Date(now)) };

    users.findByEmail.mockResolvedValue(userAccount());
    authTokens.findLatest.mockResolvedValue(null);
    authTokens.issue.mockImplementation((input) =>
      Promise.resolve({
        id: 'new-token-id',
        ...input,
        consumedAt: null,
        invalidatedAt: null,
      }),
    );
    transactions.run.mockImplementation((operation) => operation());
    rateLimits.registerAttempt.mockImplementation((input) =>
      Promise.resolve(rateLimitState(input.keyDigest)),
    );

    dependencies = {
      users,
      authTokens,
      transactions,
      secureTokens: { generate: jest.fn(() => rawToken) },
      tokenDigester: {
        digest: jest.fn(() => tokenDigest),
        matches: jest.fn(),
      },
      rateLimits,
      rateLimitKeyDigester: {
        digest: jest.fn(
          (_action, scope, identifier) => `${scope}:${identifier}`,
        ),
      },
      rateLimitDecisions: new RateLimitDecisions(clock),
      clock,
    };
  });

  it('issues a replacement only for an active unverified account', async () => {
    const result = await useCase().execute(validInput());

    expect(transactions.run).toHaveBeenCalledTimes(1);
    expect(users.findByEmail).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'mariana@example.com' }),
    );
    expect(authTokens.findLatest).toHaveBeenCalledWith(
      'user-id',
      'EMAIL_VERIFICATION',
    );
    expect(authTokens.issue).toHaveBeenCalledWith({
      userId: 'user-id',
      purpose: 'EMAIL_VERIFICATION',
      tokenDigest,
      createdAt: now,
      expiresAt: new Date('2026-08-16T18:00:00.000Z'),
    });
    expect(result).toEqual({
      accepted: true,
      verification: {
        recipient: 'mariana@example.com',
        displayName: 'Mariana Souza',
        token: rawToken,
        expiresAt: new Date('2026-08-16T18:00:00.000Z'),
      },
    });
  });

  it.each([
    ['missing account', null],
    ['verified account', userAccount('ACTIVE', now)],
    ['suspended account', userAccount('SUSPENDED')],
    ['deactivated account', userAccount('DEACTIVATED')],
  ] as const)(
    'returns the same neutral result for an ineligible %s',
    async (_case, user) => {
      users.findByEmail.mockResolvedValue(user);

      await expect(useCase().execute(validInput())).resolves.toEqual({
        accepted: true,
        verification: null,
      });
      expect(authTokens.findLatest).not.toHaveBeenCalled();
      expect(authTokens.issue).not.toHaveBeenCalled();
    },
  );

  it('keeps the response neutral while the latest emission is in cooldown', async () => {
    authTokens.findLatest.mockResolvedValue(
      authToken(new Date('2026-08-15T17:59:00.001Z')),
    );

    await expect(useCase().execute(validInput())).resolves.toEqual({
      accepted: true,
      verification: null,
    });
    expect(authTokens.issue).not.toHaveBeenCalled();
  });

  it('allows a replacement exactly at the cooldown boundary', async () => {
    authTokens.findLatest.mockResolvedValue(
      authToken(new Date('2026-08-15T17:59:00.000Z')),
    );

    await expect(useCase().execute(validInput())).resolves.toMatchObject({
      verification: { token: rawToken },
    });
    expect(authTokens.issue).toHaveBeenCalledTimes(1);
  });

  it('enforces account and origin cooldown before reading account state', async () => {
    rateLimits.registerAttempt
      .mockResolvedValueOnce(rateLimitState('account'))
      .mockResolvedValueOnce(
        rateLimitState('origin', new Date('2026-08-15T18:01:00.000Z')),
      );

    await expect(useCase().execute(validInput())).rejects.toEqual(
      new EmailVerificationResendRateLimitExceededError(60),
    );
    expect(rateLimits.registerAttempt).toHaveBeenCalledTimes(2);
    expect(users.findByEmail).not.toHaveBeenCalled();
  });

  it('uses isolated cooldown and daily keys for account and origin', async () => {
    await useCase().execute(validInput());

    expect(rateLimits.registerAttempt).toHaveBeenCalledTimes(4);
    expect(rateLimits.registerAttempt).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: 'EMAIL_RESEND',
        keyDigest: 'ACCOUNT:cooldown:mariana@example.com',
        windowDurationSeconds: 60,
        maximumAttempts: 1,
        blockDurationSeconds: 60,
      }),
    );
    expect(rateLimits.registerAttempt).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        keyDigest: 'ACCOUNT:daily:mariana@example.com',
        windowDurationSeconds: 86_400,
        maximumAttempts: 5,
        blockDurationSeconds: 86_400,
      }),
    );
  });

  it('rejects unsafe runtime options when constructed', () => {
    expect(
      () =>
        new ResendEmailVerification(dependencies, {
          ...options,
          cooldownSeconds: 0,
        }),
    ).toThrow(RangeError);
  });

  function useCase(): ResendEmailVerification {
    return new ResendEmailVerification(dependencies, options);
  }
});

function validInput(): ResendEmailVerificationInput {
  return {
    email: ' MARIANA@EXAMPLE.COM ',
    originIdentifier: ' 203.0.113.20 ',
  };
}

function userAccount(
  status: UserStatus = 'ACTIVE',
  emailVerifiedAt: Date | null = null,
): UserAccount {
  const createdAt = new Date('2026-08-14T12:00:00.000Z');

  return {
    id: 'user-id',
    displayName: 'Mariana Souza',
    email: EmailAddress.create('mariana@example.com'),
    passwordHash: 'unused-test-hash',
    status,
    emailVerifiedAt,
    platformRole: 'MEMBER',
    termsVersion: 'terms-v1',
    privacyVersion: 'privacy-v1',
    legalAcceptedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };
}

function authToken(createdAt: Date): AuthToken {
  return {
    id: 'previous-token-id',
    userId: 'user-id',
    purpose: 'EMAIL_VERIFICATION',
    tokenDigest: 'a'.repeat(64),
    createdAt,
    expiresAt: new Date('2026-08-16T18:00:00.000Z'),
    consumedAt: null,
    invalidatedAt: null,
  };
}

function rateLimitState(
  keyDigest: string,
  blockedUntil: Date | null = null,
): RateLimitState {
  return {
    action: 'EMAIL_RESEND',
    keyDigest,
    windowStartedAt: new Date('2026-08-15T18:00:00.000Z'),
    attemptCount: blockedUntil ? 2 : 1,
    blockedUntil,
    updatedAt: new Date('2026-08-15T18:00:00.000Z'),
  };
}

function portMock<T>(): jest.Mocked<T> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    markEmailVerified: jest.fn(),
    updatePasswordHash: jest.fn(),
    updateStatus: jest.fn(),
    issue: jest.fn(),
    findLatest: jest.fn(),
    consume: jest.fn(),
    invalidatePending: jest.fn(),
    run: jest.fn(),
    hash: jest.fn(),
    verify: jest.fn(),
    registerAttempt: jest.fn(),
    reset: jest.fn(),
  } as unknown as jest.Mocked<T>;
}
