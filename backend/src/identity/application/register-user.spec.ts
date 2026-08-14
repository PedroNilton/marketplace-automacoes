/* eslint-disable @typescript-eslint/unbound-method */
import { UniqueConstraintViolationError } from '../../application/errors/unique-constraint-violation.error';
import { TransactionManager } from '../../application/ports/transaction-manager';
import { EmailAddress } from '../domain/email-address';
import { PasswordPolicy } from '../domain/password-policy';
import { RateLimitState } from '../domain/rate-limit';
import { UserAccount } from '../domain/user-account';
import { InvalidRegistrationInputError } from './errors/invalid-registration-input.error';
import { RegistrationRateLimitExceededError } from './errors/registration-rate-limit-exceeded.error';
import { AuthTokenRepository } from './ports/auth-token-repository';
import { Clock } from './ports/clock';
import { PasswordHasher } from './ports/password-hasher';
import { RateLimitRepository } from './ports/rate-limit-repository';
import { UserRepository } from './ports/user-repository';
import { RateLimitDecisions } from './rate-limit-decisions';
import {
  RegisterUser,
  RegisterUserDependencies,
  RegisterUserInput,
  RegisterUserOptions,
} from './register-user';

describe('RegisterUser', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');
  const token = 'raw-verification-token';
  const tokenDigest = 'd'.repeat(64);
  const passwordHash = '$argon2id$test-hash';
  const options: RegisterUserOptions = {
    currentTermsVersion: 'terms-v1',
    currentPrivacyVersion: 'privacy-v1',
    verificationTokenTtlSeconds: 86_400,
    rateLimit: {
      windowDurationSeconds: 3_600,
      maximumAttempts: 5,
      blockDurationSeconds: 900,
    },
  };

  let dependencies: RegisterUserDependencies;
  let users: jest.Mocked<UserRepository>;
  let authTokens: jest.Mocked<AuthTokenRepository>;
  let transactions: jest.Mocked<TransactionManager>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let rateLimits: jest.Mocked<RateLimitRepository>;

  beforeEach(() => {
    users = repositoryMock<UserRepository>();
    authTokens = repositoryMock<AuthTokenRepository>();
    transactions = repositoryMock<TransactionManager>();
    passwordHasher = repositoryMock<PasswordHasher>();
    rateLimits = repositoryMock<RateLimitRepository>();

    users.create.mockResolvedValue(userAccount());
    authTokens.issue.mockImplementation((input) =>
      Promise.resolve({
        id: 'token-id',
        ...input,
        consumedAt: null,
        invalidatedAt: null,
      }),
    );
    transactions.run.mockImplementation((operation) => operation());
    passwordHasher.hash.mockResolvedValue(passwordHash);
    rateLimits.registerAttempt.mockImplementation((input) =>
      Promise.resolve(rateLimitState(input.keyDigest)),
    );

    const clock = { now: jest.fn(() => new Date(now)) } as unknown as Clock;
    dependencies = {
      users,
      authTokens,
      transactions,
      passwordPolicy: new PasswordPolicy({ contains: () => false }),
      passwordHasher,
      secureTokens: {
        generate: jest.fn(() => token),
      },
      tokenDigester: {
        digest: jest.fn(() => tokenDigest),
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

  it('normalizes input and atomically creates the account and verification token', async () => {
    const result = await useCase().execute(validInput());

    expect(transactions.run).toHaveBeenCalledTimes(1);
    const createdUser = users.create.mock.calls[0][0];
    expect({ ...createdUser, email: createdUser.email.value }).toEqual({
      displayName: 'Mariana Souza',
      email: 'mariana@example.com',
      passwordHash,
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: now,
    });
    expect(authTokens.issue).toHaveBeenCalledWith({
      userId: 'user-id',
      purpose: 'EMAIL_VERIFICATION',
      tokenDigest,
      createdAt: now,
      expiresAt: new Date('2026-08-15T12:00:00.000Z'),
    });
    expect(authTokens.issue).not.toHaveBeenCalledWith(
      expect.objectContaining({ tokenDigest: token }),
    );
    expect(result).toEqual({
      accepted: true,
      verification: {
        recipient: 'mariana@example.com',
        displayName: 'Mariana Souza',
        token,
        expiresAt: new Date('2026-08-15T12:00:00.000Z'),
      },
    });
  });

  it('uses independent account and origin keys before hashing', async () => {
    await useCase().execute(validInput());

    expect(rateLimits.registerAttempt).toHaveBeenCalledTimes(2);
    expect(rateLimits.registerAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REGISTRATION',
        keyDigest: 'ACCOUNT:mariana@example.com',
        attemptedAt: now,
        ...options.rateLimit,
      }),
    );
    expect(rateLimits.registerAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REGISTRATION',
        keyDigest: 'ORIGIN:203.0.113.10',
      }),
    );
    expect(rateLimits.registerAttempt.mock.invocationCallOrder[1]).toBeLessThan(
      passwordHasher.hash.mock.invocationCallOrder[0],
    );
  });

  it('returns the same acceptance without a verification request for duplicate email', async () => {
    users.create.mockRejectedValue(
      new UniqueConstraintViolationError(['email']),
    );

    await expect(useCase().execute(validInput())).resolves.toEqual({
      accepted: true,
      verification: null,
    });
    expect(passwordHasher.hash).toHaveBeenCalledTimes(1);
    expect(authTokens.issue).not.toHaveBeenCalled();
  });

  it('rejects a stale legal version before rate limiting or hashing', async () => {
    await expect(
      useCase().execute({ ...validInput(), termsVersion: 'terms-old' }),
    ).rejects.toMatchObject<Partial<InvalidRegistrationInputError>>({
      reason: 'TERMS_NOT_ACCEPTED',
    });
    expect(rateLimits.registerAttempt).not.toHaveBeenCalled();
    expect(passwordHasher.hash).not.toHaveBeenCalled();
  });

  it('rejects the operation when either protected key is temporarily blocked', async () => {
    rateLimits.registerAttempt
      .mockResolvedValueOnce(rateLimitState('account'))
      .mockResolvedValueOnce(
        rateLimitState('origin', new Date('2026-08-14T12:01:00.000Z')),
      );

    await expect(useCase().execute(validInput())).rejects.toEqual(
      new RegistrationRateLimitExceededError(60),
    );
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(transactions.run).not.toHaveBeenCalled();
  });

  it('rejects unsafe runtime options when constructed', () => {
    expect(
      () =>
        new RegisterUser(dependencies, {
          ...options,
          verificationTokenTtlSeconds: 0,
        }),
    ).toThrow(RangeError);
  });

  function useCase(): RegisterUser {
    return new RegisterUser(dependencies, options);
  }
});

function validInput(): RegisterUserInput {
  return {
    displayName: '  Mariana   Souza  ',
    email: ' MARIANA@EXAMPLE.COM ',
    password: 'uma frase secreta longa',
    passwordConfirmation: 'uma frase secreta longa',
    termsVersion: 'terms-v1',
    privacyVersion: 'privacy-v1',
    originIdentifier: ' 203.0.113.10 ',
  };
}

function userAccount(): UserAccount {
  const date = new Date('2026-08-14T12:00:00.000Z');

  return {
    id: 'user-id',
    displayName: 'Mariana Souza',
    email: EmailAddress.create('mariana@example.com'),
    passwordHash: '$argon2id$test-hash',
    status: 'ACTIVE',
    emailVerifiedAt: null,
    platformRole: 'MEMBER',
    termsVersion: 'terms-v1',
    privacyVersion: 'privacy-v1',
    legalAcceptedAt: date,
    createdAt: date,
    updatedAt: date,
  };
}

function rateLimitState(
  keyDigest: string,
  blockedUntil: Date | null = null,
): RateLimitState {
  const now = new Date('2026-08-14T12:00:00.000Z');

  return {
    action: 'REGISTRATION',
    keyDigest,
    windowStartedAt: now,
    attemptCount: blockedUntil ? 6 : 1,
    blockedUntil,
    updatedAt: now,
  };
}

function repositoryMock<T>(): jest.Mocked<T> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    markEmailVerified: jest.fn(),
    updatePasswordHash: jest.fn(),
    updateStatus: jest.fn(),
    issue: jest.fn(),
    consume: jest.fn(),
    invalidatePending: jest.fn(),
    run: jest.fn(),
    hash: jest.fn(),
    verify: jest.fn(),
    registerAttempt: jest.fn(),
    reset: jest.fn(),
  } as unknown as jest.Mocked<T>;
}
