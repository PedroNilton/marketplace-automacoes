import { Test, TestingModule } from '@nestjs/testing';
import { UniqueConstraintViolationError } from '../src/application/errors/unique-constraint-violation.error';
import { AuthTokenRepository } from '../src/identity/application/ports/auth-token-repository';
import { UserRepository } from '../src/identity/application/ports/user-repository';
import { AuthTokenPurpose } from '../src/identity/domain/auth-token';
import { EmailAddress } from '../src/identity/domain/email-address';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('PrismaAuthTokenRepository', () => {
  const emails = [
    't001015-primary@example.com',
    't001015-secondary@example.com',
  ];
  const issuedAt = new Date('2026-08-13T10:00:00.000Z');
  const expiresAt = new Date('2026-08-13T11:00:00.000Z');
  const consumedAt = new Date('2026-08-13T10:30:00.000Z');

  let testingModule: TestingModule;
  let tokens: AuthTokenRepository;
  let users: UserRepository;
  let prisma: PrismaService;
  let primaryUserId: string;
  let secondaryUserId: string;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [IdentityPersistenceModule],
    }).compile();

    await testingModule.init();
    tokens = testingModule.get(AuthTokenRepository);
    users = testingModule.get(UserRepository);
    prisma = testingModule.get(PrismaService);
  });

  beforeEach(async () => {
    await deleteTestData();
    primaryUserId = await createUser(emails[0]);
    secondaryUserId = await createUser(emails[1]);
  });

  afterAll(async () => {
    await deleteTestData();
    await testingModule.close();
  });

  it('stores only the digest with its purpose and validity window', async () => {
    const digest = tokenDigest('a');

    const token = await issue(primaryUserId, 'EMAIL_VERIFICATION', digest);

    expect(token).toMatchObject({
      userId: primaryUserId,
      purpose: 'EMAIL_VERIFICATION',
      tokenDigest: digest,
      createdAt: issuedAt,
      expiresAt,
      consumedAt: null,
      invalidatedAt: null,
    });
    expect(token.id).toEqual(expect.any(String));
  });

  it('invalidates the previous pending token only for the same purpose', async () => {
    const previousDigest = tokenDigest('b');
    const resetDigest = tokenDigest('c');
    const replacementDigest = tokenDigest('d');
    const replacementAt = new Date('2026-08-13T10:10:00.000Z');

    await issue(primaryUserId, 'EMAIL_VERIFICATION', previousDigest);
    await issue(primaryUserId, 'PASSWORD_RESET', resetDigest);
    await issue(
      primaryUserId,
      'EMAIL_VERIFICATION',
      replacementDigest,
      replacementAt,
    );

    const stored = await prisma.authToken.findMany({
      where: { userId: primaryUserId },
      orderBy: { createdAt: 'asc' },
    });

    expect(stored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tokenDigest: previousDigest,
          invalidatedAt: replacementAt,
        }),
        expect.objectContaining({
          tokenDigest: resetDigest,
          invalidatedAt: null,
        }),
        expect.objectContaining({
          tokenDigest: replacementDigest,
          invalidatedAt: null,
        }),
      ]),
    );
  });

  it('rolls back invalidation when replacement creation fails', async () => {
    const pendingDigest = tokenDigest('e');
    const duplicateDigest = tokenDigest('f');

    await issue(primaryUserId, 'EMAIL_VERIFICATION', pendingDigest);
    await issue(secondaryUserId, 'PASSWORD_RESET', duplicateDigest);

    await expect(
      issue(primaryUserId, 'EMAIL_VERIFICATION', duplicateDigest),
    ).rejects.toBeInstanceOf(UniqueConstraintViolationError);

    await expect(
      prisma.authToken.findUnique({ where: { tokenDigest: pendingDigest } }),
    ).resolves.toMatchObject({ invalidatedAt: null });
  });

  it('finds the most recent emission only for the requested purpose', async () => {
    const previousDigest = tokenDigest('9');
    const resetDigest = tokenDigest('a');
    const latestDigest = tokenDigest('b');
    await issue(primaryUserId, 'EMAIL_VERIFICATION', previousDigest);
    await issue(
      primaryUserId,
      'PASSWORD_RESET',
      resetDigest,
      new Date('2026-08-13T10:05:00.000Z'),
    );
    await issue(
      primaryUserId,
      'EMAIL_VERIFICATION',
      latestDigest,
      new Date('2026-08-13T10:10:00.000Z'),
    );

    await expect(
      tokens.findLatest(primaryUserId, 'EMAIL_VERIFICATION'),
    ).resolves.toMatchObject({ tokenDigest: latestDigest });
    await expect(
      tokens.findLatest(primaryUserId, 'PASSWORD_RESET'),
    ).resolves.toMatchObject({ tokenDigest: resetDigest });
    await expect(
      tokens.findLatest(secondaryUserId, 'EMAIL_VERIFICATION'),
    ).resolves.toBeNull();
  });

  it('invalidates all pending tokens for one account and purpose', async () => {
    const digest = tokenDigest('1');
    const invalidatedAt = new Date('2026-08-13T10:20:00.000Z');
    await issue(primaryUserId, 'PASSWORD_RESET', digest);

    await expect(
      tokens.invalidatePending(primaryUserId, 'PASSWORD_RESET', invalidatedAt),
    ).resolves.toBe(1);
    await expect(
      tokens.invalidatePending(primaryUserId, 'PASSWORD_RESET', invalidatedAt),
    ).resolves.toBe(0);
  });

  it('consumes a valid token exactly once', async () => {
    const digest = tokenDigest('2');
    await issue(primaryUserId, 'EMAIL_VERIFICATION', digest);

    const first = await tokens.consume({
      purpose: 'EMAIL_VERIFICATION',
      tokenDigest: digest,
      consumedAt,
    });
    const repeated = await tokens.consume({
      purpose: 'EMAIL_VERIFICATION',
      tokenDigest: digest,
      consumedAt: new Date('2026-08-13T10:40:00.000Z'),
    });

    expect(first?.consumedAt).toEqual(consumedAt);
    expect(repeated).toBeNull();
  });

  it.each([
    ['expired', new Date('2026-08-13T11:00:00.000Z'), false],
    ['after expiration', new Date('2026-08-13T11:00:00.001Z'), false],
    ['before expiration', new Date('2026-08-13T10:59:59.999Z'), true],
  ] as const)(
    'evaluates a token as %s at the controlled time',
    async (_scenario, attemptAt, consumable) => {
      const digest = tokenDigest(
        consumable ? '3' : attemptAt.getMilliseconds() === 0 ? '4' : '5',
      );
      await issue(primaryUserId, 'PASSWORD_RESET', digest);

      const result = await tokens.consume({
        purpose: 'PASSWORD_RESET',
        tokenDigest: digest,
        consumedAt: attemptAt,
      });

      expect(result !== null).toBe(consumable);
    },
  );

  it('rejects an invalidated token and a mismatched purpose', async () => {
    const invalidatedDigest = tokenDigest('6');
    const otherPurposeDigest = tokenDigest('7');
    await issue(primaryUserId, 'EMAIL_VERIFICATION', invalidatedDigest);
    await tokens.invalidatePending(
      primaryUserId,
      'EMAIL_VERIFICATION',
      consumedAt,
    );
    await issue(primaryUserId, 'PASSWORD_RESET', otherPurposeDigest);

    await expect(
      tokens.consume({
        purpose: 'EMAIL_VERIFICATION',
        tokenDigest: invalidatedDigest,
        consumedAt,
      }),
    ).resolves.toBeNull();
    await expect(
      tokens.consume({
        purpose: 'EMAIL_VERIFICATION',
        tokenDigest: otherPurposeDigest,
        consumedAt,
      }),
    ).resolves.toBeNull();
  });

  it('allows exactly one concurrent consumer to win', async () => {
    const digest = tokenDigest('8');
    await issue(primaryUserId, 'EMAIL_VERIFICATION', digest);

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        tokens.consume({
          purpose: 'EMAIL_VERIFICATION',
          tokenDigest: digest,
          consumedAt,
        }),
      ),
    );

    expect(results.filter((result) => result !== null)).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(7);
  });

  function issue(
    userId: string,
    purpose: AuthTokenPurpose,
    tokenDigestValue: string,
    createdAt = issuedAt,
  ) {
    return tokens.issue({
      userId,
      purpose,
      tokenDigest: tokenDigestValue,
      createdAt,
      expiresAt,
    });
  }

  async function createUser(email: string): Promise<string> {
    const user = await users.create({
      displayName: 'Teste de token',
      email: EmailAddress.create(email),
      passwordHash: 'argon2id:test-hash',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: issuedAt,
    });

    return user.id;
  }

  async function deleteTestData(): Promise<void> {
    const testUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const userIds = testUsers.map((user) => user.id);

    if (userIds.length > 0) {
      await prisma.authToken.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }
});

function tokenDigest(character: string): string {
  return character.repeat(64);
}
