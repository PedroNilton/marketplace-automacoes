/* eslint-disable @typescript-eslint/unbound-method */
import { TransactionManager } from '../../application/ports/transaction-manager';
import { AuthToken } from '../domain/auth-token';
import { EmailAddress } from '../domain/email-address';
import { InvalidPasswordError } from '../domain/invalid-password.error';
import { PasswordPolicy } from '../domain/password-policy';
import { UserAccount } from '../domain/user-account';
import {
  ConfirmPasswordReset,
  ConfirmPasswordResetDependencies,
  ConfirmPasswordResetInput,
} from './confirm-password-reset';
import { AuthTokenRepository } from './ports/auth-token-repository';
import { Clock } from './ports/clock';
import { PasswordHasher } from './ports/password-hasher';
import { SessionRepository } from './ports/session-repository';
import { TokenDigester } from './ports/token-digester';
import { UserRepository } from './ports/user-repository';

describe('ConfirmPasswordReset', () => {
  const now = new Date('2026-08-17T12:00:00.000Z');
  const tokenDigest = 'd'.repeat(64);

  let authTokens: jest.Mocked<AuthTokenRepository>;
  let users: jest.Mocked<UserRepository>;
  let sessions: jest.Mocked<SessionRepository>;
  let transactions: jest.Mocked<TransactionManager>;
  let passwordPolicy: jest.Mocked<PasswordPolicy>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let tokenDigester: jest.Mocked<TokenDigester>;
  let clock: jest.Mocked<Clock>;
  let dependencies: ConfirmPasswordResetDependencies;

  beforeEach(() => {
    authTokens = portMock<AuthTokenRepository>();
    users = portMock<UserRepository>();
    sessions = portMock<SessionRepository>();
    transactions = portMock<TransactionManager>();
    passwordPolicy = portMock<PasswordPolicy>();
    passwordHasher = portMock<PasswordHasher>();
    tokenDigester = portMock<TokenDigester>();
    clock = portMock<Clock>();

    clock.now.mockReturnValue(now);
    tokenDigester.digest.mockReturnValue(tokenDigest);
    authTokens.findConsumable.mockResolvedValue(authToken(null));
    authTokens.consume.mockResolvedValue(authToken(now));
    passwordHasher.hash.mockResolvedValue('new-password-hash');
    transactions.run.mockImplementation((operation) => operation());
    users.updatePasswordHash.mockResolvedValue(userAccount());
    sessions.revokeAllForUser.mockResolvedValue(2);
    dependencies = {
      authTokens,
      users,
      sessions,
      transactions,
      passwordPolicy,
      passwordHasher,
      tokenDigester,
      clock,
    };
  });

  it('updates the hash, consumes the authorization and revokes every session atomically', async () => {
    await expect(useCase().execute(validInput())).resolves.toEqual({
      status: 'RESET',
      notification: {
        recipient: 'mariana@example.com',
        displayName: 'Mariana Souza',
      },
    });

    expect(passwordPolicy.validate).toHaveBeenCalledWith(
      validInput().password,
      validInput().passwordConfirmation,
    );
    expect(authTokens.findConsumable).toHaveBeenCalledWith({
      purpose: 'PASSWORD_RESET',
      tokenDigest,
      consumedAt: now,
    });
    expect(passwordHasher.hash).toHaveBeenCalledWith(validInput().password);
    expect(transactions.run).toHaveBeenCalledTimes(1);
    expect(authTokens.consume).toHaveBeenCalledWith({
      purpose: 'PASSWORD_RESET',
      tokenDigest,
      consumedAt: now,
    });
    expect(users.updatePasswordHash).toHaveBeenCalledWith(
      'user-id',
      'new-password-hash',
    );
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
      'user-id',
      now,
      'PASSWORD_RESET',
    );
    expect(authTokens.consume.mock.invocationCallOrder[0]).toBeLessThan(
      users.updatePasswordHash.mock.invocationCallOrder[0],
    );
    expect(users.updatePasswordHash.mock.invocationCallOrder[0]).toBeLessThan(
      sessions.revokeAllForUser.mock.invocationCallOrder[0],
    );
    expect(users.updateStatus).not.toHaveBeenCalled();
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it.each(['', 'x'.repeat(513)])(
    'rejects an unsafe token without validating or hashing the password',
    async (token) => {
      await expect(
        useCase().execute({ ...validInput(), token }),
      ).resolves.toEqual({
        status: 'INVALID_OR_EXPIRED',
        notification: null,
      });
      expect(passwordPolicy.validate).not.toHaveBeenCalled();
      expect(tokenDigester.digest).not.toHaveBeenCalled();
      expect(authTokens.findConsumable).not.toHaveBeenCalled();
      expect(passwordHasher.hash).not.toHaveBeenCalled();
      expect(transactions.run).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid, expired or used token before hashing the password', async () => {
    authTokens.findConsumable.mockResolvedValue(null);

    await expect(useCase().execute(validInput())).resolves.toEqual({
      status: 'INVALID_OR_EXPIRED',
      notification: null,
    });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(transactions.run).not.toHaveBeenCalled();
  });

  it('validates the password policy before reading the authorization', async () => {
    passwordPolicy.validate.mockImplementation(() => {
      throw new InvalidPasswordError('TOO_SHORT');
    });

    await expect(useCase().execute(validInput())).rejects.toEqual(
      new InvalidPasswordError('TOO_SHORT'),
    );
    expect(tokenDigester.digest).not.toHaveBeenCalled();
    expect(authTokens.findConsumable).not.toHaveBeenCalled();
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(transactions.run).not.toHaveBeenCalled();
  });

  it('does not open a transaction if hashing fails', async () => {
    passwordHasher.hash.mockRejectedValue(new Error('hash unavailable'));

    await expect(useCase().execute(validInput())).rejects.toThrow(
      'hash unavailable',
    );
    expect(transactions.run).not.toHaveBeenCalled();
  });

  it('handles a token lost to a concurrent confirmation without changing the account', async () => {
    authTokens.consume.mockResolvedValue(null);

    await expect(useCase().execute(validInput())).resolves.toEqual({
      status: 'INVALID_OR_EXPIRED',
      notification: null,
    });
    expect(users.updatePasswordHash).not.toHaveBeenCalled();
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('fails the transaction when the consumed token references no account', async () => {
    users.updatePasswordHash.mockResolvedValue(null);

    await expect(useCase().execute(validInput())).rejects.toThrow(
      'Password reset token references a missing user account.',
    );
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('does not return success when session revocation fails', async () => {
    sessions.revokeAllForUser.mockRejectedValue(
      new Error('session revocation failed'),
    );

    await expect(useCase().execute(validInput())).rejects.toThrow(
      'session revocation failed',
    );
  });

  function useCase(): ConfirmPasswordReset {
    return new ConfirmPasswordReset(dependencies);
  }
});

function validInput(): ConfirmPasswordResetInput {
  return {
    token: 'raw-password-reset-token',
    password: 'uma senha longa e válida 🔐',
    passwordConfirmation: 'uma senha longa e válida 🔐',
  };
}

function authToken(consumedAt: Date | null): AuthToken {
  return {
    id: 'token-id',
    userId: 'user-id',
    purpose: 'PASSWORD_RESET',
    tokenDigest: 'd'.repeat(64),
    createdAt: new Date('2026-08-17T11:00:00.000Z'),
    expiresAt: new Date('2026-08-17T12:30:00.000Z'),
    consumedAt,
    invalidatedAt: null,
  };
}

function userAccount(): UserAccount {
  const createdAt = new Date('2026-08-16T12:00:00.000Z');

  return {
    id: 'user-id',
    displayName: 'Mariana Souza',
    email: EmailAddress.create('mariana@example.com'),
    passwordHash: 'new-password-hash',
    status: 'SUSPENDED',
    emailVerifiedAt: new Date('2026-08-16T13:00:00.000Z'),
    platformRole: 'MEMBER',
    termsVersion: 'terms-v1',
    privacyVersion: 'privacy-v1',
    legalAcceptedAt: createdAt,
    createdAt,
    updatedAt: nowForFixture(),
  };
}

function nowForFixture(): Date {
  return new Date('2026-08-17T12:00:00.000Z');
}

function portMock<T>(): jest.Mocked<T> {
  return {
    issue: jest.fn(),
    findLatest: jest.fn(),
    findConsumable: jest.fn(),
    consume: jest.fn(),
    invalidatePending: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    markEmailVerified: jest.fn(),
    updatePasswordHash: jest.fn(),
    updateStatus: jest.fn(),
    resolve: jest.fn(),
    touch: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
    run: jest.fn(),
    validate: jest.fn(),
    hash: jest.fn(),
    verify: jest.fn(),
    digest: jest.fn(),
    matches: jest.fn(),
    now: jest.fn(),
  } as unknown as jest.Mocked<T>;
}
