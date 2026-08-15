import { Test, TestingModule } from '@nestjs/testing';
import { TransactionManager } from '../src/application/ports/transaction-manager';
import {
  ConfirmEmailVerification,
  ConfirmEmailVerificationDependencies,
} from '../src/identity/application/confirm-email-verification';
import { AuthTokenRepository } from '../src/identity/application/ports/auth-token-repository';
import { Clock } from '../src/identity/application/ports/clock';
import { UserRepository } from '../src/identity/application/ports/user-repository';
import { EmailAddress } from '../src/identity/domain/email-address';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { Sha256TokenDigester } from '../src/identity/infrastructure/security/sha256-token-digester';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('ConfirmEmailVerification integration', () => {
  const now = new Date('2026-08-15T15:00:00.000Z');
  const emails = [
    'verification-success@example.com',
    'verification-expired@example.com',
    'verification-used@example.com',
    'verification-invalid@example.com',
    'verification-concurrent@example.com',
    'verification-purpose@example.com',
  ];

  let testingModule: TestingModule;
  let prisma: PrismaService;
  let users: UserRepository;
  let authTokens: AuthTokenRepository;
  let tokenDigester: Sha256TokenDigester;
  let dependencies: ConfirmEmailVerificationDependencies;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [IdentityPersistenceModule],
    }).compile();
    await testingModule.init();

    prisma = testingModule.get(PrismaService);
    users = testingModule.get(UserRepository);
    authTokens = testingModule.get(AuthTokenRepository);
    tokenDigester = new Sha256TokenDigester();
    dependencies = {
      authTokens,
      users,
      transactions: testingModule.get(TransactionManager),
      tokenDigester,
      clock: new FixedClock(now),
    };
  });

  beforeEach(async () => {
    await deleteTestData();
  });

  afterAll(async () => {
    await deleteTestData();
    await testingModule.close();
  });

  it('verifies the account, consumes the token and invalidates pending siblings', async () => {
    const userId = await createUser(emails[0]);
    const rawToken = 'valid-primary-token';
    const siblingToken = 'pending-sibling-token';
    await prisma.authToken.createMany({
      data: [
        tokenData(userId, rawToken, new Date('2026-08-15T16:00:00.000Z')),
        tokenData(userId, siblingToken, new Date('2026-08-15T17:00:00.000Z')),
      ],
    });

    await expect(useCase().execute({ token: rawToken })).resolves.toEqual({
      status: 'VERIFIED',
    });

    const user = await users.findById(userId);
    const primary = await findToken(rawToken);
    const sibling = await findToken(siblingToken);
    expect(user?.emailVerifiedAt).toEqual(now);
    expect(primary).toMatchObject({ consumedAt: now, invalidatedAt: null });
    expect(sibling).toMatchObject({ consumedAt: null, invalidatedAt: now });
  });

  it('rejects a token exactly at its expiration boundary without changing the account', async () => {
    const userId = await createUser(emails[1]);
    const rawToken = 'expired-token';
    await issueToken(userId, rawToken, now);

    await expect(useCase().execute({ token: rawToken })).resolves.toEqual({
      status: 'INVALID_OR_EXPIRED',
    });
    expect((await users.findById(userId))?.emailVerifiedAt).toBeNull();
    expect(await findToken(rawToken)).toMatchObject({
      consumedAt: null,
      invalidatedAt: null,
    });
  });

  it('returns a safe result when the same token is used again', async () => {
    const userId = await createUser(emails[2]);
    const rawToken = 'single-use-token';
    await issueToken(userId, rawToken, new Date('2026-08-15T16:00:00.000Z'));

    await expect(useCase().execute({ token: rawToken })).resolves.toEqual({
      status: 'VERIFIED',
    });
    await expect(useCase().execute({ token: rawToken })).resolves.toEqual({
      status: 'INVALID_OR_EXPIRED',
    });
    expect((await users.findById(userId))?.emailVerifiedAt).toEqual(now);
  });

  it('returns the same invalid result for an unknown token and wrong purpose', async () => {
    const userId = await createUser(emails[5]);
    const passwordResetToken = 'password-reset-token';
    await authTokens.issue({
      userId,
      purpose: 'PASSWORD_RESET',
      tokenDigest: tokenDigester.digest(passwordResetToken),
      createdAt: new Date('2026-08-15T14:00:00.000Z'),
      expiresAt: new Date('2026-08-15T16:00:00.000Z'),
    });

    const results = await Promise.all([
      useCase().execute({ token: 'unknown-token' }),
      useCase().execute({ token: passwordResetToken }),
    ]);

    expect(results).toEqual([
      { status: 'INVALID_OR_EXPIRED' },
      { status: 'INVALID_OR_EXPIRED' },
    ]);
    expect((await users.findById(userId))?.emailVerifiedAt).toBeNull();
  });

  it('allows exactly one winner under concurrent confirmation attempts', async () => {
    const userId = await createUser(emails[4]);
    const rawToken = 'concurrent-token';
    await issueToken(userId, rawToken, new Date('2026-08-15T16:00:00.000Z'));

    const results = await Promise.all(
      Array.from({ length: 12 }, () => useCase().execute({ token: rawToken })),
    );

    expect(
      results.filter((result) => result.status === 'VERIFIED'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'INVALID_OR_EXPIRED'),
    ).toHaveLength(11);
    expect((await users.findById(userId))?.emailVerifiedAt).toEqual(now);
    expect(await findToken(rawToken)).toMatchObject({ consumedAt: now });
  });

  function useCase(): ConfirmEmailVerification {
    return new ConfirmEmailVerification(dependencies);
  }

  async function createUser(email: string): Promise<string> {
    const user = await users.create({
      displayName: 'Usuário de Verificação',
      email: EmailAddress.create(email),
      passwordHash: 'unused-test-hash',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: new Date('2026-08-15T14:00:00.000Z'),
    });

    return user.id;
  }

  function issueToken(userId: string, rawToken: string, expiresAt: Date) {
    return authTokens.issue({
      userId,
      purpose: 'EMAIL_VERIFICATION',
      tokenDigest: tokenDigester.digest(rawToken),
      createdAt: new Date('2026-08-15T14:00:00.000Z'),
      expiresAt,
    });
  }

  function tokenData(userId: string, rawToken: string, expiresAt: Date) {
    return {
      userId,
      purpose: 'EMAIL_VERIFICATION' as const,
      tokenDigest: tokenDigester.digest(rawToken),
      createdAt: new Date('2026-08-15T14:00:00.000Z'),
      expiresAt,
    };
  }

  function findToken(rawToken: string) {
    return prisma.authToken.findUnique({
      where: { tokenDigest: tokenDigester.digest(rawToken) },
    });
  }

  async function deleteTestData(): Promise<void> {
    await prisma.authToken.deleteMany({
      where: { user: { email: { in: emails } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
});

class FixedClock extends Clock {
  constructor(private readonly value: Date) {
    super();
  }

  now(): Date {
    return new Date(this.value);
  }
}
