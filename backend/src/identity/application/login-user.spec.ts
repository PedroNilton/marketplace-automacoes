/* eslint-disable @typescript-eslint/unbound-method */
import { TransactionManager } from '../../application/ports/transaction-manager';
import { EmailAddress } from '../domain/email-address';
import { RateLimitState } from '../domain/rate-limit';
import { UserAccount, UserStatus } from '../domain/user-account';
import { AccountUnavailableError } from './errors/account-unavailable.error';
import { InvalidLoginCredentialsError } from './errors/invalid-login-credentials.error';
import { LoginRateLimitExceededError } from './errors/login-rate-limit-exceeded.error';
import {
  LoginUser,
  LoginUserDependencies,
  LoginUserInput,
  LoginUserOptions,
} from './login-user';
import { Clock } from './ports/clock';
import { CsrfTokenDeriver } from './ports/csrf-token-deriver';
import { PasswordHasher } from './ports/password-hasher';
import { RateLimitKeyDigester } from './ports/rate-limit-key-digester';
import { RateLimitRepository } from './ports/rate-limit-repository';
import { SecureTokenGenerator } from './ports/secure-token-generator';
import { SessionRepository } from './ports/session-repository';
import { TokenDigester } from './ports/token-digester';
import { UserRepository } from './ports/user-repository';
import { RateLimitDecisions } from './rate-limit-decisions';

describe('LoginUser', () => {
  const now = new Date('2026-08-15T20:00:00.000Z');
  const options: LoginUserOptions = {
    sessionAbsoluteTtlSeconds: 604_800,
    sessionIdleTtlSeconds: 86_400,
    dummyPasswordHash: '$argon2id$dummy-hash',
    rateLimit: {
      windowDurationSeconds: 900,
      maximumAttempts: 5,
      blockDurationSeconds: 900,
    },
  };

  let users: jest.Mocked<UserRepository>;
  let sessions: jest.Mocked<SessionRepository>;
  let transactions: jest.Mocked<TransactionManager>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let secureTokens: jest.Mocked<SecureTokenGenerator>;
  let csrfTokens: jest.Mocked<CsrfTokenDeriver>;
  let tokenDigester: jest.Mocked<TokenDigester>;
  let rateLimits: jest.Mocked<RateLimitRepository>;
  let rateLimitKeyDigester: jest.Mocked<RateLimitKeyDigester>;
  let clock: jest.Mocked<Clock>;
  let dependencies: LoginUserDependencies;

  beforeEach(() => {
    users = portMock<UserRepository>();
    sessions = portMock<SessionRepository>();
    transactions = portMock<TransactionManager>();
    passwordHasher = portMock<PasswordHasher>();
    secureTokens = portMock<SecureTokenGenerator>();
    csrfTokens = portMock<CsrfTokenDeriver>();
    tokenDigester = portMock<TokenDigester>();
    rateLimits = portMock<RateLimitRepository>();
    rateLimitKeyDigester = portMock<RateLimitKeyDigester>();
    clock = portMock<Clock>();

    users.findByEmail.mockResolvedValue(userAccount());
    transactions.run.mockImplementation((operation) => operation());
    passwordHasher.verify.mockResolvedValue(true);
    secureTokens.generate.mockReturnValue('raw-session-token');
    csrfTokens.derive.mockReturnValue('raw-csrf-token');
    tokenDigester.digest.mockImplementation((value) => `digest:${value}`);
    rateLimitKeyDigester.digest.mockImplementation(
      (action, scope, identifier) => `${action}:${scope}:${identifier}`,
    );
    rateLimits.registerAttempt.mockImplementation((input) =>
      Promise.resolve(rateLimitState(input.keyDigest)),
    );
    rateLimits.reset.mockResolvedValue(true);
    clock.now.mockReturnValue(now);

    dependencies = {
      users,
      sessions,
      transactions,
      passwordHasher,
      secureTokens,
      csrfTokens,
      tokenDigester,
      rateLimits,
      rateLimitKeyDigester,
      rateLimitDecisions: new RateLimitDecisions(clock),
      clock,
    };
  });

  it('creates a common session for verified credentials and a safe return path', async () => {
    const result = await useCase().execute(validInput());

    expect(users.findByEmail).toHaveBeenCalledWith(
      EmailAddress.create('mariana@example.com'),
    );
    expect(passwordHasher.verify).toHaveBeenCalledWith(
      '$argon2id$stored-hash',
      'uma frase secreta longa',
    );
    expect(sessions.create).toHaveBeenCalledWith({
      userId: 'user-id',
      tokenDigest: 'digest:raw-session-token',
      csrfDigest: 'digest:raw-csrf-token',
      createdAt: now,
      idleExpiresAt: new Date('2026-08-16T20:00:00.000Z'),
      absoluteExpiresAt: new Date('2026-08-22T20:00:00.000Z'),
    });
    expect(result).toEqual({
      user: {
        id: 'user-id',
        displayName: 'Mariana Souza',
        emailVerified: true,
        platformRole: 'MEMBER',
      },
      session: {
        token: 'raw-session-token',
        csrfToken: 'raw-csrf-token',
        restricted: false,
        returnTo: '/ofertas/123/solicitar',
        idleExpiresAt: new Date('2026-08-16T20:00:00.000Z'),
        absoluteExpiresAt: new Date('2026-08-22T20:00:00.000Z'),
      },
    });
  });

  it('creates a restricted session and directs an unverified account to verification', async () => {
    users.findByEmail.mockResolvedValue(userAccount({ emailVerifiedAt: null }));

    const result = await useCase().execute(validInput());

    expect(result.user.emailVerified).toBe(false);
    expect(result.session).toMatchObject({
      restricted: true,
      returnTo: '/verificar-email',
    });
  });

  it.each(['https://evil.example/path', '//evil.example', '/entrar'])(
    'replaces unsafe return target %s with the authenticated fallback',
    async (returnTo) => {
      await expect(
        useCase().execute({ ...validInput(), returnTo }),
      ).resolves.toMatchObject({ session: { returnTo: '/conta' } });
    },
  );

  it('verifies the dummy hash and returns the same error for a missing account', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(useCase().execute(validInput())).rejects.toEqual(
      new InvalidLoginCredentialsError(),
    );
    expect(passwordHasher.verify).toHaveBeenCalledWith(
      options.dummyPasswordHash,
      validInput().password,
    );
    expect(sessions.create).not.toHaveBeenCalled();
    expect(secureTokens.generate).not.toHaveBeenCalled();
  });

  it('treats a malformed email as generic invalid credentials with dummy verification', async () => {
    await expect(
      useCase().execute({ ...validInput(), email: 'not-an-email' }),
    ).rejects.toBeInstanceOf(InvalidLoginCredentialsError);

    expect(users.findByEmail).not.toHaveBeenCalled();
    expect(passwordHasher.verify).toHaveBeenCalledWith(
      options.dummyPasswordHash,
      validInput().password,
    );
    expect(rateLimitKeyDigester.digest).toHaveBeenCalledWith(
      'LOGIN',
      'ACCOUNT',
      'not-an-email',
    );
  });

  it('returns generic invalid credentials when the password does not match', async () => {
    passwordHasher.verify.mockResolvedValue(false);

    await expect(useCase().execute(validInput())).rejects.toBeInstanceOf(
      InvalidLoginCredentialsError,
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it.each<UserStatus>(['SUSPENDED', 'DEACTIVATED'])(
    'reveals status %s only after the password is verified',
    async (status) => {
      users.findByEmail.mockResolvedValue(userAccount({ status }));

      await expect(useCase().execute(validInput())).rejects.toBeInstanceOf(
        AccountUnavailableError,
      );
      expect(passwordHasher.verify).toHaveBeenCalled();
      expect(sessions.create).not.toHaveBeenCalled();
    },
  );

  it('keeps an unavailable account indistinguishable when its password is wrong', async () => {
    users.findByEmail.mockResolvedValue(userAccount({ status: 'SUSPENDED' }));
    passwordHasher.verify.mockResolvedValue(false);

    await expect(useCase().execute(validInput())).rejects.toBeInstanceOf(
      InvalidLoginCredentialsError,
    );
  });

  it('stops before account lookup and Argon2id when the account key is limited', async () => {
    rateLimits.registerAttempt.mockResolvedValueOnce(
      rateLimitState(
        'LOGIN:ACCOUNT:mariana@example.com',
        new Date('2026-08-15T20:15:00.000Z'),
      ),
    );

    await expect(useCase().execute(validInput())).rejects.toEqual(
      new LoginRateLimitExceededError(900),
    );
    expect(rateLimits.registerAttempt).toHaveBeenCalledTimes(1);
    expect(users.findByEmail).not.toHaveBeenCalled();
    expect(passwordHasher.verify).not.toHaveBeenCalled();
  });

  it('stops before Argon2id when the origin key is limited', async () => {
    rateLimits.registerAttempt
      .mockResolvedValueOnce(rateLimitState('account-key'))
      .mockResolvedValueOnce(
        rateLimitState('origin-key', new Date('2026-08-15T20:05:00.000Z')),
      );

    await expect(useCase().execute(validInput())).rejects.toEqual(
      new LoginRateLimitExceededError(300),
    );
    expect(users.findByEmail).not.toHaveBeenCalled();
    expect(passwordHasher.verify).not.toHaveBeenCalled();
  });

  it('registers normalized account and origin keys before expensive verification', async () => {
    await useCase().execute(validInput());

    expect(rateLimits.registerAttempt).toHaveBeenNthCalledWith(1, {
      action: 'LOGIN',
      keyDigest: 'LOGIN:ACCOUNT:mariana@example.com',
      attemptedAt: now,
      ...options.rateLimit,
    });
    expect(rateLimits.registerAttempt).toHaveBeenNthCalledWith(2, {
      action: 'LOGIN',
      keyDigest: 'LOGIN:ORIGIN:203.0.113.10',
      attemptedAt: now,
      ...options.rateLimit,
    });
    const lastRateLimitCall =
      rateLimits.registerAttempt.mock.invocationCallOrder.at(-1);
    const passwordVerificationCall =
      passwordHasher.verify.mock.invocationCallOrder[0];
    expect(lastRateLimitCall).toBeLessThan(passwordVerificationCall ?? 0);
  });

  it('persists the session and resets both successful-login counters transactionally', async () => {
    await useCase().execute(validInput());

    expect(transactions.run).toHaveBeenCalledTimes(1);
    expect(rateLimits.reset).toHaveBeenNthCalledWith(
      1,
      'LOGIN',
      'LOGIN:ACCOUNT:mariana@example.com',
    );
    expect(rateLimits.reset).toHaveBeenNthCalledWith(
      2,
      'LOGIN',
      'LOGIN:ORIGIN:203.0.113.10',
    );
  });

  it('does not return raw credentials when session persistence fails', async () => {
    sessions.create.mockRejectedValue(new Error('database unavailable'));

    await expect(useCase().execute(validInput())).rejects.toThrow(
      'database unavailable',
    );
    expect(rateLimits.reset).not.toHaveBeenCalled();
  });

  it('rejects an empty origin before applying limits', async () => {
    await expect(
      useCase().execute({ ...validInput(), originIdentifier: '  ' }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(rateLimits.registerAttempt).not.toHaveBeenCalled();
  });

  it.each([
    ['absolute TTL', { sessionAbsoluteTtlSeconds: 0 }],
    ['idle TTL', { sessionIdleTtlSeconds: -1 }],
    [
      'rate window',
      { rateLimit: { ...options.rateLimit, windowDurationSeconds: 0 } },
    ],
    [
      'rate maximum',
      { rateLimit: { ...options.rateLimit, maximumAttempts: 1.5 } },
    ],
    [
      'block duration',
      { rateLimit: { ...options.rateLimit, blockDurationSeconds: 0 } },
    ],
    ['dummy hash', { dummyPasswordHash: ' ' }],
  ])('rejects invalid %s options', (_scenario, override) => {
    expect(
      () => new LoginUser(dependencies, { ...options, ...override }),
    ).toThrow(RangeError);
  });

  it('rejects an idle TTL greater than the absolute TTL', () => {
    expect(
      () =>
        new LoginUser(dependencies, {
          ...options,
          sessionAbsoluteTtlSeconds: 60,
          sessionIdleTtlSeconds: 61,
        }),
    ).toThrow(RangeError);
  });

  function useCase(): LoginUser {
    return new LoginUser(dependencies, options);
  }
});

function validInput(): LoginUserInput {
  return {
    email: ' MARIANA@EXAMPLE.COM ',
    password: 'uma frase secreta longa',
    returnTo: '/ofertas/123/solicitar',
    originIdentifier: ' 203.0.113.10 ',
  };
}

function userAccount(
  overrides: Partial<Pick<UserAccount, 'status' | 'emailVerifiedAt'>> = {},
): UserAccount {
  const date = new Date('2026-08-14T12:00:00.000Z');

  return {
    id: 'user-id',
    displayName: 'Mariana Souza',
    email: EmailAddress.create('mariana@example.com'),
    passwordHash: '$argon2id$stored-hash',
    status: 'ACTIVE',
    emailVerifiedAt: new Date('2026-08-14T13:00:00.000Z'),
    platformRole: 'MEMBER',
    termsVersion: 'terms-v1',
    privacyVersion: 'privacy-v1',
    legalAcceptedAt: date,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

function rateLimitState(
  keyDigest: string,
  blockedUntil: Date | null = null,
): RateLimitState {
  const date = new Date('2026-08-15T20:00:00.000Z');

  return {
    action: 'LOGIN',
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
    run: jest.fn(),
    hash: jest.fn(),
    verify: jest.fn(),
    generate: jest.fn(),
    derive: jest.fn(),
    digest: jest.fn(),
    matches: jest.fn(),
    registerAttempt: jest.fn(),
    reset: jest.fn(),
    resolve: jest.fn(),
    touch: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
    now: jest.fn(),
  } as unknown as jest.Mocked<T>;
}
