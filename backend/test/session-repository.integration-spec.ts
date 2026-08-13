import { Test, TestingModule } from '@nestjs/testing';
import { SessionRepository } from '../src/identity/application/ports/session-repository';
import { UserRepository } from '../src/identity/application/ports/user-repository';
import { EmailAddress } from '../src/identity/domain/email-address';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('PrismaSessionRepository', () => {
  const emails = [
    't001016-primary@example.com',
    't001016-secondary@example.com',
  ];
  const createdAt = new Date('2026-08-13T10:00:00.000Z');
  const idleExpiresAt = new Date('2026-08-14T10:00:00.000Z');
  const absoluteExpiresAt = new Date('2026-08-20T10:00:00.000Z');

  let testingModule: TestingModule;
  let sessions: SessionRepository;
  let users: UserRepository;
  let prisma: PrismaService;
  let primaryUserId: string;
  let secondaryUserId: string;
  let digestSequence: number;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [IdentityPersistenceModule],
    }).compile();

    await testingModule.init();
    sessions = testingModule.get(SessionRepository);
    users = testingModule.get(UserRepository);
    prisma = testingModule.get(PrismaService);
  });

  beforeEach(async () => {
    await deleteTestData();
    primaryUserId = await createUser(emails[0]);
    secondaryUserId = await createUser(emails[1]);
    digestSequence = 1;
  });

  afterAll(async () => {
    await deleteTestData();
    await testingModule.close();
  });

  it('creates a session using only token and CSRF digests', async () => {
    const tokenDigest = nextDigest();
    const csrfDigest = nextDigest();

    const session = await createSession(primaryUserId, tokenDigest, csrfDigest);

    expect(session).toMatchObject({
      userId: primaryUserId,
      tokenDigest,
      csrfDigest,
      createdAt,
      lastSeenAt: createdAt,
      idleExpiresAt,
      absoluteExpiresAt,
      revokedAt: null,
      revokeReason: null,
    });
    expect(session.id).toEqual(expect.any(String));
  });

  it('resolves an active session and revalidates minimal account identity', async () => {
    const tokenDigest = nextDigest();
    await createSession(primaryUserId, tokenDigest);
    const verifiedAt = new Date('2026-08-13T09:00:00.000Z');
    await users.markEmailVerified(primaryUserId, verifiedAt);
    await prisma.user.update({
      where: { id: primaryUserId },
      data: { platformRole: 'ADMIN' },
    });

    await expect(
      sessions.resolve(tokenDigest, new Date('2026-08-13T11:00:00.000Z')),
    ).resolves.toMatchObject({
      session: { tokenDigest, userId: primaryUserId },
      identity: {
        userId: primaryUserId,
        emailVerifiedAt: verifiedAt,
        platformRole: 'ADMIN',
      },
    });
  });

  it('keeps an active unverified account distinguishable as restricted', async () => {
    const tokenDigest = nextDigest();
    await createSession(primaryUserId, tokenDigest);

    await expect(
      sessions.resolve(tokenDigest, new Date('2026-08-13T11:00:00.000Z')),
    ).resolves.toMatchObject({
      identity: { emailVerifiedAt: null, platformRole: 'MEMBER' },
    });
  });

  it.each([
    ['unknown digest', () => nextDigest(), new Date('2026-08-13T11:00:00Z')],
    ['idle boundary', null, idleExpiresAt],
    ['absolute boundary', null, absoluteExpiresAt],
  ] as const)(
    'does not resolve at %s',
    async (_scenario, digestFactory, now) => {
      const storedDigest = nextDigest();
      await createSession(primaryUserId, storedDigest);

      await expect(
        sessions.resolve(digestFactory ? digestFactory() : storedDigest, now),
      ).resolves.toBeNull();
    },
  );

  it.each(['SUSPENDED', 'DEACTIVATED'] as const)(
    'blocks an existing session when the account becomes %s',
    async (status) => {
      const tokenDigest = nextDigest();
      await createSession(primaryUserId, tokenDigest);
      await users.updateStatus(primaryUserId, status);

      await expect(
        sessions.resolve(tokenDigest, new Date('2026-08-13T11:00:00Z')),
      ).resolves.toBeNull();
    },
  );

  it('touches activity only after the configured interval', async () => {
    const tokenDigest = nextDigest();
    await createSession(primaryUserId, tokenDigest);
    const touchedAt = new Date('2026-08-13T10:15:00.000Z');
    const extendedIdleExpiry = new Date('2026-08-14T10:15:00.000Z');

    await expect(
      sessions.touch({
        tokenDigest,
        touchedAt,
        touchIfLastSeenBefore: new Date('2026-08-13T09:59:59.999Z'),
        idleExpiresAt: extendedIdleExpiry,
      }),
    ).resolves.toBe(false);
    await expect(
      sessions.touch({
        tokenDigest,
        touchedAt,
        touchIfLastSeenBefore: createdAt,
        idleExpiresAt: extendedIdleExpiry,
      }),
    ).resolves.toBe(true);

    await expect(
      prisma.session.findUnique({ where: { tokenDigest } }),
    ).resolves.toMatchObject({
      lastSeenAt: touchedAt,
      idleExpiresAt: extendedIdleExpiry,
    });
  });

  it('caps idle extension at the absolute expiration', async () => {
    const tokenDigest = nextDigest();
    await createSession(primaryUserId, tokenDigest);

    await sessions.touch({
      tokenDigest,
      touchedAt: new Date('2026-08-13T10:15:00.000Z'),
      touchIfLastSeenBefore: createdAt,
      idleExpiresAt: new Date('2026-08-25T10:00:00.000Z'),
    });

    await expect(
      prisma.session.findUnique({ where: { tokenDigest } }),
    ).resolves.toMatchObject({ idleExpiresAt: absoluteExpiresAt });
  });

  it('does not touch an expired, revoked or suspended session', async () => {
    const expiredDigest = nextDigest();
    const revokedDigest = nextDigest();
    const suspendedDigest = nextDigest();
    await createSession(primaryUserId, expiredDigest, nextDigest(), {
      idleExpiresAt: new Date('2026-08-13T10:10:00.000Z'),
    });
    await createSession(primaryUserId, revokedDigest);
    await sessions.revoke(revokedDigest, createdAt, 'SECURITY');
    await createSession(secondaryUserId, suspendedDigest);
    await users.updateStatus(secondaryUserId, 'SUSPENDED');
    const touch = (tokenDigest: string) =>
      sessions.touch({
        tokenDigest,
        touchedAt: new Date('2026-08-13T10:15:00.000Z'),
        touchIfLastSeenBefore: createdAt,
        idleExpiresAt,
      });

    await expect(touch(expiredDigest)).resolves.toBe(false);
    await expect(touch(revokedDigest)).resolves.toBe(false);
    await expect(touch(suspendedDigest)).resolves.toBe(false);
  });

  it('revokes the current session idempotently for logout', async () => {
    const tokenDigest = nextDigest();
    await createSession(primaryUserId, tokenDigest);
    const revokedAt = new Date('2026-08-13T12:00:00.000Z');

    await expect(
      sessions.revoke(tokenDigest, revokedAt, 'LOGOUT'),
    ).resolves.toBe(true);
    await expect(
      sessions.revoke(tokenDigest, revokedAt, 'LOGOUT'),
    ).resolves.toBe(false);
    await expect(sessions.resolve(tokenDigest, createdAt)).resolves.toBeNull();
  });

  it('revokes all active sessions without rewriting an earlier revocation', async () => {
    const firstDigest = nextDigest();
    const secondDigest = nextDigest();
    const alreadyRevokedDigest = nextDigest();
    await createSession(primaryUserId, firstDigest);
    await createSession(primaryUserId, secondDigest);
    await createSession(primaryUserId, alreadyRevokedDigest);
    await sessions.revoke(alreadyRevokedDigest, createdAt, 'LOGOUT');
    const revokedAt = new Date('2026-08-13T12:00:00.000Z');

    await expect(
      sessions.revokeAllForUser(primaryUserId, revokedAt, 'PASSWORD_RESET'),
    ).resolves.toBe(2);
    await expect(
      sessions.revokeAllForUser(primaryUserId, revokedAt, 'PASSWORD_RESET'),
    ).resolves.toBe(0);
    await expect(
      prisma.session.findUnique({
        where: { tokenDigest: alreadyRevokedDigest },
      }),
    ).resolves.toMatchObject({ revokeReason: 'LOGOUT' });
  });

  function createSession(
    userId: string,
    tokenDigest: string,
    csrfDigest = nextDigest(),
    overrides: { idleExpiresAt?: Date; absoluteExpiresAt?: Date } = {},
  ) {
    return sessions.create({
      userId,
      tokenDigest,
      csrfDigest,
      createdAt,
      idleExpiresAt: overrides.idleExpiresAt ?? idleExpiresAt,
      absoluteExpiresAt: overrides.absoluteExpiresAt ?? absoluteExpiresAt,
    });
  }

  async function createUser(email: string): Promise<string> {
    const user = await users.create({
      displayName: 'Teste de sessão',
      email: EmailAddress.create(email),
      passwordHash: 'argon2id:test-hash',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: createdAt,
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
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }

  function nextDigest(): string {
    const digest = digestSequence.toString(16).padStart(64, '0');
    digestSequence += 1;
    return digest;
  }
});
