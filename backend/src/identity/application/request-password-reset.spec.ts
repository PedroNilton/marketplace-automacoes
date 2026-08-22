/* eslint-disable @typescript-eslint/unbound-method */
import { TransactionManager } from '../../application/ports/transaction-manager';
import { EmailAddress } from '../domain/email-address';
import { RateLimitState } from '../domain/rate-limit';
import { UserAccount, UserStatus } from '../domain/user-account';
import { PasswordResetRateLimitExceededError } from './errors/password-reset-rate-limit-exceeded.error';
import { AuthTokenRepository } from './ports/auth-token-repository';
import { Clock } from './ports/clock';
import { RateLimitKeyDigester } from './ports/rate-limit-key-digester';
import { RateLimitRepository } from './ports/rate-limit-repository';
import { SecureTokenGenerator } from './ports/secure-token-generator';
import { TokenDigester } from './ports/token-digester';
import { UserRepository } from './ports/user-repository';
import { RateLimitDecisions } from './rate-limit-decisions';
import {
  RequestPasswordReset,
  RequestPasswordResetDependencies,
  RequestPasswordResetInput,
  RequestPasswordResetOptions,
} from './request-password-reset';

describe('RequestPasswordReset', () => {
  const now = new Date('2026-08-16T13:00:00.000Z');
  const options: RequestPasswordResetOptions = {
    resetTokenTtlSeconds: 1_800,
    maximumAttemptsPerHour: 5,
    hourlyWindowDurationSeconds: 3_600,
  };

  let users: jest.Mocked<UserRepository>;
  let authTokens: jest.Mocked<AuthTokenRepository>;
  let transactions: jest.Mocked<TransactionManager>;
  let secureTokens: jest.Mocked<SecureTokenGenerator>;
  let tokenDigester: jest.Mocked<TokenDigester>;
  let rateLimits: jest.Mocked<RateLimitRepository>;
  let rateLimitKeyDigester: jest.Mocked<RateLimitKeyDigester>;
  let clock: jest.Mocked<Clock>;
  let dependencies: RequestPasswordResetDependencies;

  beforeEach(() => {
    users = portMock<UserRepository>();
    authTokens = portMock<AuthTokenRepository>();
    transactions = portMock<TransactionManager>();
    secureTokens = portMock<SecureTokenGenerator>();
    tokenDigester = portMock<TokenDigester>();
    rateLimits = portMock<RateLimitRepository>();
    rateLimitKeyDigester = portMock<RateLimitKeyDigester>();
    clock = portMock<Clock>();

    users.findByEmail.mockResolvedValue(userAccount());
    transactions.run.mockImplementation((operation) => operation());
    secureTokens.generate.mockReturnValue('raw-password-reset-token');
    tokenDigester.digest.mockReturnValue('password-reset-token-digest');
    rateLimitKeyDigester.digest.mockImplementation(
      (action, scope, identifier) => `${action}:${scope}:${identifier}`,
    );
    rateLimits.registerAttempt.mockImplementation((input) =>
      Promise.resolve(rateLimitState(input.keyDigest)),
    );
    clock.now.mockReturnValue(now);
    dependencies = {
      users,
      authTokens,
      transactions,
      secureTokens,
      tokenDigester,
      rateLimits,
      rateLimitKeyDigester,
      rateLimitDecisions: new RateLimitDecisions(clock),
      clock,
      emailDelivery: emailDeliveryMock(),
    };
  });

  it('issues a single-use password reset authorization for an existing account', async () => {
    const result = await useCase().execute(validInput());

    expect(users.findByEmail).toHaveBeenCalledWith(
      EmailAddress.create('mariana@example.com'),
    );
    expect(authTokens.issue).toHaveBeenCalledWith({
      userId: 'user-id',
      purpose: 'PASSWORD_RESET',
      tokenDigest: 'password-reset-token-digest',
      createdAt: now,
      expiresAt: new Date('2026-08-16T13:30:00.000Z'),
    });
    expect(result).toEqual({
      accepted: true,
      reset: {
        recipient: 'mariana@example.com',
        displayName: 'Mariana Souza',
        token: 'raw-password-reset-token',
        expiresAt: new Date('2026-08-16T13:30:00.000Z'),
      },
    });
  });

  it('returns the neutral contract for a missing account without issuing a token', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(useCase().execute(validInput())).resolves.toEqual({
      accepted: true,
      reset: null,
    });
    expect(secureTokens.generate).not.toHaveBeenCalled();
    expect(authTokens.issue).not.toHaveBeenCalled();
  });

  it.each<UserStatus>(['ACTIVE', 'SUSPENDED', 'DEACTIVATED'])(
    'allows a %s account to request recovery without changing its state',
    async (status) => {
      users.findByEmail.mockResolvedValue(userAccount(status));

      await expect(useCase().execute(validInput())).resolves.toMatchObject({
        accepted: true,
        reset: { recipient: 'mariana@example.com' },
      });
      expect(users.updateStatus).not.toHaveBeenCalled();
      expect(users.updatePasswordHash).not.toHaveBeenCalled();
    },
  );

  it('applies normalized account and origin limits before looking up the account', async () => {
    await useCase().execute(validInput());

    expect(rateLimits.registerAttempt).toHaveBeenNthCalledWith(1, {
      action: 'PASSWORD_RESET',
      keyDigest: 'PASSWORD_RESET:ACCOUNT:mariana@example.com',
      attemptedAt: now,
      windowDurationSeconds: 3_600,
      maximumAttempts: 5,
      blockDurationSeconds: 3_600,
    });
    expect(rateLimits.registerAttempt).toHaveBeenNthCalledWith(2, {
      action: 'PASSWORD_RESET',
      keyDigest: 'PASSWORD_RESET:ORIGIN:203.0.113.40',
      attemptedAt: now,
      windowDurationSeconds: 3_600,
      maximumAttempts: 5,
      blockDurationSeconds: 3_600,
    });
    const lastLimitCall =
      rateLimits.registerAttempt.mock.invocationCallOrder.at(-1);
    const lookupCall = users.findByEmail.mock.invocationCallOrder[0];
    expect(lastLimitCall).toBeLessThan(lookupCall ?? 0);
  });

  it('stops before account lookup when the account key is temporarily limited', async () => {
    rateLimits.registerAttempt.mockResolvedValueOnce(
      rateLimitState('account-key', new Date('2026-08-16T13:10:00.000Z')),
    );

    await expect(useCase().execute(validInput())).rejects.toEqual(
      new PasswordResetRateLimitExceededError(600),
    );
    expect(rateLimits.registerAttempt).toHaveBeenCalledTimes(1);
    expect(users.findByEmail).not.toHaveBeenCalled();
  });

  it('stops before account lookup when the complementary origin key is limited', async () => {
    rateLimits.registerAttempt
      .mockResolvedValueOnce(rateLimitState('account-key'))
      .mockResolvedValueOnce(
        rateLimitState('origin-key', new Date('2026-08-16T13:05:00.000Z')),
      );

    await expect(useCase().execute(validInput())).rejects.toEqual(
      new PasswordResetRateLimitExceededError(300),
    );
    expect(users.findByEmail).not.toHaveBeenCalled();
  });

  it('keeps lookup and token issuance inside the transaction boundary', async () => {
    await useCase().execute(validInput());

    expect(transactions.run).toHaveBeenCalledTimes(1);
    expect(users.findByEmail).toHaveBeenCalled();
    expect(authTokens.issue).toHaveBeenCalled();
  });

  it('does not return a delivery request if persistence fails', async () => {
    authTokens.issue.mockRejectedValue(new Error('database unavailable'));

    await expect(useCase().execute(validInput())).rejects.toThrow(
      'database unavailable',
    );
  });

  it('rejects an empty origin before applying limits', async () => {
    await expect(
      useCase().execute({ ...validInput(), originIdentifier: '  ' }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(rateLimits.registerAttempt).not.toHaveBeenCalled();
  });

  it.each([
    ['token TTL', { resetTokenTtlSeconds: 0 }],
    ['maximum attempts', { maximumAttemptsPerHour: -1 }],
    ['hourly window', { hourlyWindowDurationSeconds: 1.5 }],
  ])('rejects invalid %s options', (_scenario, overrides) => {
    expect(
      () =>
        new RequestPasswordReset(dependencies, { ...options, ...overrides }),
    ).toThrow(RangeError);
  });

  function useCase(): RequestPasswordReset {
    return new RequestPasswordReset(dependencies, options);
  }
});

function validInput(): RequestPasswordResetInput {
  return {
    email: ' MARIANA@EXAMPLE.COM ',
    originIdentifier: ' 203.0.113.40 ',
  };
}

function emailDeliveryMock() {
  return {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendPasswordChanged: jest.fn().mockResolvedValue(undefined),
  };
}

function userAccount(status: UserStatus = 'ACTIVE'): UserAccount {
  const createdAt = new Date('2026-08-15T12:00:00.000Z');

  return {
    id: 'user-id',
    displayName: 'Mariana Souza',
    email: EmailAddress.create('mariana@example.com'),
    passwordHash: 'unused-test-hash',
    status,
    emailVerifiedAt: new Date('2026-08-15T13:00:00.000Z'),
    platformRole: 'MEMBER',
    termsVersion: 'terms-v1',
    privacyVersion: 'privacy-v1',
    legalAcceptedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };
}

function rateLimitState(
  keyDigest: string,
  blockedUntil: Date | null = null,
): RateLimitState {
  const date = new Date('2026-08-16T13:00:00.000Z');

  return {
    action: 'PASSWORD_RESET',
    keyDigest,
    windowStartedAt: date,
    attemptCount: blockedUntil ? 6 : 1,
    blockedUntil,
    updatedAt: date,
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
    generate: jest.fn(),
    digest: jest.fn(),
    matches: jest.fn(),
    registerAttempt: jest.fn(),
    reset: jest.fn(),
    now: jest.fn(),
  } as unknown as jest.Mocked<T>;
}
