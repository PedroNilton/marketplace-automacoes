import { Test, TestingModule } from '@nestjs/testing';
import { TransactionManager } from '../src/application/ports/transaction-manager';
import {
  ConfirmPasswordReset,
  ConfirmPasswordResetDependencies,
} from '../src/identity/application/confirm-password-reset';
import { AuthTokenRepository } from '../src/identity/application/ports/auth-token-repository';
import { Clock } from '../src/identity/application/ports/clock';
import { PasswordHasher } from '../src/identity/application/ports/password-hasher';
import { SessionRepository } from '../src/identity/application/ports/session-repository';
import { TokenDigester } from '../src/identity/application/ports/token-digester';
import { UserRepository } from '../src/identity/application/ports/user-repository';
import { EmailAddress } from '../src/identity/domain/email-address';
import { InvalidPasswordError } from '../src/identity/domain/invalid-password.error';
import { PasswordPolicy } from '../src/identity/domain/password-policy';
import { UserStatus } from '../src/identity/domain/user-account';
import { Argon2idPasswordHasher } from '../src/identity/infrastructure/password/argon2id-password-hasher';
import { LocalPasswordBlocklist } from '../src/identity/infrastructure/password/local-password-blocklist';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { Sha256TokenDigester } from '../src/identity/infrastructure/security/sha256-token-digester';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('ConfirmPasswordReset integration', () => {
  const now = new Date('2026-08-17T15:00:00.000Z');
  const emails = [
    'confirm-reset-success@example.com',
    'confirm-reset-expired@example.com',
    'confirm-reset-invalid@example.com',
    'confirm-reset-suspended@example.com',
    'confirm-reset-deactivated@example.com',
    'confirm-reset-policy@example.com',
    'confirm-reset-rollback@example.com',
    'confirm-reset-concurrent@example.com',
  ];
  const newPassword = 'nova senha extensa e válida 🔐';

  let testingModule: TestingModule;
  let prisma: PrismaService;
  let users: UserRepository;
  let authTokens: AuthTokenRepository;
  let sessions: SessionRepository;
  let transactions: TransactionManager;
  let tokenDigester: TokenDigester;
  let passwordHasher: Argon2idPasswordHasher;
  let dependencies: ConfirmPasswordResetDependencies;
  let sessionSequence: number;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [IdentityPersistenceModule],
    }).compile();
    await testingModule.init();

    prisma = testingModule.get(PrismaService);
    users = testingModule.get(UserRepository);
    authTokens = testingModule.get(AuthTokenRepository);
    sessions = testingModule.get(SessionRepository);
    transactions = testingModule.get(TransactionManager);
    tokenDigester = new Sha256TokenDigester();
    passwordHasher = new Argon2idPasswordHasher({
      memoryCostKiB: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    dependencies = {
      authTokens,
      users,
      sessions,
      transactions,
      passwordPolicy: new PasswordPolicy(new LocalPasswordBlocklist()),
      passwordHasher,
      tokenDigester,
      clock: new FixedClock(now),
      emailDelivery: noOpEmailDelivery(),
    };
  });

  beforeEach(async () => {
    await deleteTestData();
    sessionSequence = 1;
  });

  afterAll(async () => {
    await deleteTestData();
    await testingModule.close();
  });

  it('changes the password, consumes the token and revokes every active session without creating login', async () => {
    const oldPassword = 'senha antiga longa e válida';
    const userId = await createUser(
      emails[0],
      'ACTIVE',
      await passwordHasher.hash(oldPassword),
    );
    const rawToken = 'valid-password-reset-token';
    await issueResetToken(userId, rawToken);
    const activeDigests = await Promise.all([
      createSession(userId),
      createSession(userId),
    ]);
    const previouslyRevokedDigest = await createSession(userId);
    await sessions.revoke(previouslyRevokedDigest, now, 'LOGOUT');

    await expect(
      useCase().execute(input(rawToken, newPassword)),
    ).resolves.toEqual({
      status: 'RESET',
      notification: {
        recipient: emails[0],
        displayName: 'Usuário de Redefinição',
      },
    });

    const storedUser = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    expect(
      await passwordHasher.verify(storedUser.passwordHash, newPassword),
    ).toBe(true);
    expect(
      await passwordHasher.verify(storedUser.passwordHash, oldPassword),
    ).toBe(false);
    expect(await findToken(rawToken)).toMatchObject({ consumedAt: now });
    await expect(
      prisma.session.findMany({
        where: { tokenDigest: { in: activeDigests } },
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          revokedAt: now,
          revokeReason: 'PASSWORD_RESET',
        }),
        expect.objectContaining({
          revokedAt: now,
          revokeReason: 'PASSWORD_RESET',
        }),
      ]),
    );
    await expect(
      prisma.session.findUniqueOrThrow({
        where: { tokenDigest: previouslyRevokedDigest },
      }),
    ).resolves.toMatchObject({ revokedAt: now, revokeReason: 'LOGOUT' });
    await expect(prisma.session.count({ where: { userId } })).resolves.toBe(3);
  });

  it('rejects a token exactly at expiration without changing password or session', async () => {
    const userId = await createUser(emails[1]);
    const rawToken = 'expired-password-reset-token';
    await issueResetToken(userId, rawToken, now);
    const sessionDigest = await createSession(userId);

    await expect(
      useCase().execute(input(rawToken, newPassword)),
    ).resolves.toEqual({
      status: 'INVALID_OR_EXPIRED',
      notification: null,
    });
    await expect(storedUser(userId)).resolves.toMatchObject({
      passwordHash: 'old-password-hash',
    });
    await expect(findToken(rawToken)).resolves.toMatchObject({
      consumedAt: null,
      invalidatedAt: null,
    });
    await expect(storedSession(sessionDigest)).resolves.toMatchObject({
      revokedAt: null,
    });
  });

  it('returns one safe result for an unknown, used or wrong-purpose token', async () => {
    const userId = await createUser(emails[2]);
    const usedToken = 'used-password-reset-token';
    const wrongPurposeToken = 'email-verification-token';
    await issueResetToken(userId, usedToken);
    await prisma.authToken.update({
      where: { tokenDigest: tokenDigester.digest(usedToken) },
      data: { consumedAt: new Date('2026-08-17T14:30:00.000Z') },
    });
    await authTokens.issue({
      userId,
      purpose: 'EMAIL_VERIFICATION',
      tokenDigest: tokenDigester.digest(wrongPurposeToken),
      createdAt: new Date('2026-08-17T14:00:00.000Z'),
      expiresAt: new Date('2026-08-17T16:00:00.000Z'),
    });

    const results = await Promise.all([
      useCase().execute(input('unknown-password-reset-token', newPassword)),
      useCase().execute(input(usedToken, newPassword)),
      useCase().execute(input(wrongPurposeToken, newPassword)),
    ]);

    expect(results).toEqual(
      Array.from({ length: 3 }, () => ({
        status: 'INVALID_OR_EXPIRED',
        notification: null,
      })),
    );
    await expect(storedUser(userId)).resolves.toMatchObject({
      passwordHash: 'old-password-hash',
    });
    await expect(prisma.session.count({ where: { userId } })).resolves.toBe(0);
  });

  it.each<[UserStatus, number]>([
    ['SUSPENDED', 3],
    ['DEACTIVATED', 4],
  ])(
    'changes the password while preserving %s state',
    async (status, index) => {
      const userId = await createUser(emails[index], status);
      const rawToken = `${status.toLowerCase()}-password-reset-token`;
      await issueResetToken(userId, rawToken);

      await expect(
        useCase().execute(input(rawToken, newPassword)),
      ).resolves.toMatchObject({ status: 'RESET' });
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      expect(user.status).toBe(status);
      expect(await passwordHasher.verify(user.passwordHash, newPassword)).toBe(
        true,
      );
    },
  );

  it.each([
    ['short password', 'curta', 'curta'],
    ['blocked password', 'passwordpassword', 'passwordpassword'],
    [
      'confirmation mismatch',
      'senha suficientemente longa',
      'outra senha também longa',
    ],
  ])(
    'rejects %s before consuming the token',
    async (_scenario, password, confirmation) => {
      const userId = await createUser(emails[5]);
      const rawToken = 'policy-password-reset-token';
      await issueResetToken(userId, rawToken);

      await expect(
        useCase().execute({
          token: rawToken,
          password,
          passwordConfirmation: confirmation,
        }),
      ).rejects.toBeInstanceOf(InvalidPasswordError);
      await expect(storedUser(userId)).resolves.toMatchObject({
        passwordHash: 'old-password-hash',
      });
      await expect(findToken(rawToken)).resolves.toMatchObject({
        consumedAt: null,
      });
    },
  );

  it('rolls back token, password and sessions when the final revocation step fails', async () => {
    const userId = await createUser(emails[6]);
    const rawToken = 'rollback-password-reset-token';
    await issueResetToken(userId, rawToken);
    const sessionDigest = await createSession(userId);
    const failingSessions: SessionRepository = {
      create: (value) => sessions.create(value),
      resolve: (digest, resolvedAt) => sessions.resolve(digest, resolvedAt),
      touch: (value) => sessions.touch(value),
      revoke: (digest, revokedAt, reason) =>
        sessions.revoke(digest, revokedAt, reason),
      revokeAllForUser: async (id, revokedAt, reason) => {
        await sessions.revokeAllForUser(id, revokedAt, reason);
        throw new Error('forced revocation failure');
      },
    };

    await expect(
      useCase({ sessions: failingSessions }).execute(
        input(rawToken, newPassword),
      ),
    ).rejects.toThrow('forced revocation failure');
    await expect(storedUser(userId)).resolves.toMatchObject({
      passwordHash: 'old-password-hash',
    });
    await expect(findToken(rawToken)).resolves.toMatchObject({
      consumedAt: null,
    });
    await expect(storedSession(sessionDigest)).resolves.toMatchObject({
      revokedAt: null,
      revokeReason: null,
    });
  });

  it('allows exactly one winner when the same token is confirmed concurrently', async () => {
    const userId = await createUser(emails[7]);
    const rawToken = 'concurrent-password-reset-token';
    await issueResetToken(userId, rawToken);
    const sessionDigest = await createSession(userId);
    const concurrentDependencies = {
      passwordHasher: new StaticPasswordHasher('concurrent-password-hash'),
    };

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        useCase(concurrentDependencies).execute(input(rawToken, newPassword)),
      ),
    );

    expect(results.filter((result) => result.status === 'RESET')).toHaveLength(
      1,
    );
    expect(
      results.filter((result) => result.status === 'INVALID_OR_EXPIRED'),
    ).toHaveLength(7);
    await expect(storedUser(userId)).resolves.toMatchObject({
      passwordHash: 'concurrent-password-hash',
    });
    await expect(findToken(rawToken)).resolves.toMatchObject({
      consumedAt: now,
    });
    await expect(storedSession(sessionDigest)).resolves.toMatchObject({
      revokedAt: now,
      revokeReason: 'PASSWORD_RESET',
    });
  });

  function useCase(
    overrides: Partial<ConfirmPasswordResetDependencies> = {},
  ): ConfirmPasswordReset {
    return new ConfirmPasswordReset({ ...dependencies, ...overrides });
  }

  async function createUser(
    email: string,
    status: UserStatus = 'ACTIVE',
    passwordHash = 'old-password-hash',
  ): Promise<string> {
    const user = await users.create({
      displayName: 'Usuário de Redefinição',
      email: EmailAddress.create(email),
      passwordHash,
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: new Date('2026-08-17T13:00:00.000Z'),
    });

    if (status !== 'ACTIVE') {
      await users.updateStatus(user.id, status);
    }

    return user.id;
  }

  function issueResetToken(
    userId: string,
    rawToken: string,
    expiresAt = new Date('2026-08-17T15:30:00.000Z'),
  ) {
    return authTokens.issue({
      userId,
      purpose: 'PASSWORD_RESET',
      tokenDigest: tokenDigester.digest(rawToken),
      createdAt: new Date('2026-08-17T14:30:00.000Z'),
      expiresAt,
    });
  }

  async function createSession(userId: string): Promise<string> {
    const sequence = sessionSequence;
    sessionSequence += 1;
    const tokenDigest = sequence.toString(16).padStart(64, '0');
    const csrfDigest = (sequence + 100).toString(16).padStart(64, '0');
    await sessions.create({
      userId,
      tokenDigest,
      csrfDigest,
      createdAt: new Date('2026-08-17T14:00:00.000Z'),
      idleExpiresAt: new Date('2026-08-18T14:00:00.000Z'),
      absoluteExpiresAt: new Date('2026-08-24T14:00:00.000Z'),
    });

    return tokenDigest;
  }

  function storedUser(userId: string) {
    return prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }

  function findToken(rawToken: string) {
    return prisma.authToken.findUnique({
      where: { tokenDigest: tokenDigester.digest(rawToken) },
    });
  }

  function storedSession(tokenDigest: string) {
    return prisma.session.findUniqueOrThrow({ where: { tokenDigest } });
  }

  async function deleteTestData(): Promise<void> {
    await prisma.session.deleteMany({
      where: { user: { email: { in: emails } } },
    });
    await prisma.authToken.deleteMany({
      where: { user: { email: { in: emails } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
});

function noOpEmailDelivery() {
  return {
    sendEmailVerification: (): Promise<void> => Promise.resolve(),
    sendPasswordReset: (): Promise<void> => Promise.resolve(),
    sendPasswordChanged: (): Promise<void> => Promise.resolve(),
  };
}

function input(token: string, password: string) {
  return { token, password, passwordConfirmation: password };
}

class FixedClock extends Clock {
  constructor(private readonly value: Date) {
    super();
  }

  now(): Date {
    return new Date(this.value);
  }
}

class StaticPasswordHasher extends PasswordHasher {
  constructor(private readonly passwordHash: string) {
    super();
  }

  hash(): Promise<string> {
    return Promise.resolve(this.passwordHash);
  }

  verify(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
