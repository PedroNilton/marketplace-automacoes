/* eslint-disable @typescript-eslint/unbound-method */
import { TransactionManager } from '../../application/ports/transaction-manager';
import { EmailAddress } from '../domain/email-address';
import { AuthToken } from '../domain/auth-token';
import { UserAccount } from '../domain/user-account';
import {
  ConfirmEmailVerification,
  ConfirmEmailVerificationDependencies,
} from './confirm-email-verification';
import { AuthTokenRepository } from './ports/auth-token-repository';
import { TokenDigester } from './ports/token-digester';
import { UserRepository } from './ports/user-repository';

describe('ConfirmEmailVerification', () => {
  const now = new Date('2026-08-15T12:00:00.000Z');
  const rawToken = 'raw-email-verification-token';
  const tokenDigest = 'd'.repeat(64);

  let dependencies: ConfirmEmailVerificationDependencies;
  let authTokens: jest.Mocked<AuthTokenRepository>;
  let users: jest.Mocked<UserRepository>;
  let transactions: jest.Mocked<TransactionManager>;
  let tokenDigester: jest.Mocked<TokenDigester>;

  beforeEach(() => {
    authTokens = portMock<AuthTokenRepository>();
    users = portMock<UserRepository>();
    transactions = portMock<TransactionManager>();
    tokenDigester = portMock<TokenDigester>();

    transactions.run.mockImplementation((operation) => operation());
    tokenDigester.digest.mockReturnValue(tokenDigest);
    authTokens.consume.mockResolvedValue(authToken());
    authTokens.invalidatePending.mockResolvedValue(1);
    users.markEmailVerified.mockResolvedValue(userAccount(now));

    dependencies = {
      authTokens,
      users,
      transactions,
      tokenDigester,
      clock: { now: jest.fn(() => new Date(now)) },
    };
  });

  it('consumes the token, verifies the account and invalidates pending siblings atomically', async () => {
    await expect(useCase().execute({ token: rawToken })).resolves.toEqual({
      status: 'VERIFIED',
    });

    expect(transactions.run).toHaveBeenCalledTimes(1);
    expect(tokenDigester.digest).toHaveBeenCalledWith(rawToken);
    expect(authTokens.consume).toHaveBeenCalledWith({
      purpose: 'EMAIL_VERIFICATION',
      tokenDigest,
      consumedAt: now,
    });
    expect(users.markEmailVerified).toHaveBeenCalledWith('user-id', now);
    expect(authTokens.invalidatePending).toHaveBeenCalledWith(
      'user-id',
      'EMAIL_VERIFICATION',
      now,
    );
    expect(authTokens.consume.mock.invocationCallOrder[0]).toBeLessThan(
      users.markEmailVerified.mock.invocationCallOrder[0],
    );
    expect(users.markEmailVerified.mock.invocationCallOrder[0]).toBeLessThan(
      authTokens.invalidatePending.mock.invocationCallOrder[0],
    );
  });

  it('returns one generic result for an invalid, expired or used token', async () => {
    authTokens.consume.mockResolvedValue(null);

    await expect(useCase().execute({ token: rawToken })).resolves.toEqual({
      status: 'INVALID_OR_EXPIRED',
    });
    expect(users.markEmailVerified).not.toHaveBeenCalled();
    expect(authTokens.invalidatePending).not.toHaveBeenCalled();
  });

  it('does not alter the account when the same token is submitted again', async () => {
    authTokens.consume
      .mockResolvedValueOnce(authToken())
      .mockResolvedValueOnce(null);

    await expect(useCase().execute({ token: rawToken })).resolves.toEqual({
      status: 'VERIFIED',
    });
    await expect(useCase().execute({ token: rawToken })).resolves.toEqual({
      status: 'INVALID_OR_EXPIRED',
    });
    expect(users.markEmailVerified).toHaveBeenCalledTimes(1);
  });

  it.each(['', 'x'.repeat(513)])(
    'rejects an unsafe raw token without hashing or opening a transaction',
    async (token) => {
      await expect(useCase().execute({ token })).resolves.toEqual({
        status: 'INVALID_OR_EXPIRED',
      });
      expect(tokenDigester.digest).not.toHaveBeenCalled();
      expect(transactions.run).not.toHaveBeenCalled();
    },
  );

  it('fails the transaction when a consumed token references no account', async () => {
    users.markEmailVerified.mockResolvedValue(null);

    await expect(useCase().execute({ token: rawToken })).rejects.toThrow(
      'Email verification token references a missing user account.',
    );
    expect(authTokens.invalidatePending).not.toHaveBeenCalled();
  });

  function useCase(): ConfirmEmailVerification {
    return new ConfirmEmailVerification(dependencies);
  }
});

function authToken(): AuthToken {
  return {
    id: 'token-id',
    userId: 'user-id',
    purpose: 'EMAIL_VERIFICATION',
    tokenDigest: 'd'.repeat(64),
    createdAt: new Date('2026-08-15T11:00:00.000Z'),
    expiresAt: new Date('2026-08-15T13:00:00.000Z'),
    consumedAt: new Date('2026-08-15T12:00:00.000Z'),
    invalidatedAt: null,
  };
}

function userAccount(emailVerifiedAt: Date): UserAccount {
  const createdAt = new Date('2026-08-14T12:00:00.000Z');

  return {
    id: 'user-id',
    displayName: 'Mariana Souza',
    email: EmailAddress.create('mariana@example.com'),
    passwordHash: 'unused-test-hash',
    status: 'ACTIVE',
    emailVerifiedAt,
    platformRole: 'MEMBER',
    termsVersion: 'terms-v1',
    privacyVersion: 'privacy-v1',
    legalAcceptedAt: createdAt,
    createdAt,
    updatedAt: emailVerifiedAt,
  };
}

function portMock<T>(): jest.Mocked<T> {
  return {
    issue: jest.fn(),
    consume: jest.fn(),
    invalidatePending: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    markEmailVerified: jest.fn(),
    updatePasswordHash: jest.fn(),
    updateStatus: jest.fn(),
    run: jest.fn(),
    digest: jest.fn(),
    matches: jest.fn(),
    now: jest.fn(),
  } as unknown as jest.Mocked<T>;
}
