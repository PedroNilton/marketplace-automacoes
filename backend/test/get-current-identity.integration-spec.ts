import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationRequiredError } from '../src/identity/application/errors/authentication-required.error';
import {
  GetCurrentIdentity,
  GetCurrentIdentityDependencies,
  GetCurrentIdentityOptions,
} from '../src/identity/application/get-current-identity';
import { Clock } from '../src/identity/application/ports/clock';
import { CsrfTokenDeriver } from '../src/identity/application/ports/csrf-token-deriver';
import { SessionRepository } from '../src/identity/application/ports/session-repository';
import { UserRepository } from '../src/identity/application/ports/user-repository';
import { EmailAddress } from '../src/identity/domain/email-address';
import { UserStatus } from '../src/identity/domain/user-account';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { Sha256TokenDigester } from '../src/identity/infrastructure/security/sha256-token-digester';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('GetCurrentIdentity integration', () => {
  const now = new Date('2026-08-15T23:00:00.000Z');
  const emails = [
    'identity-verified@example.com',
    'identity-unverified@example.com',
    'identity-idle-expired@example.com',
    'identity-absolute-expired@example.com',
    'identity-revoked@example.com',
    'identity-suspended@example.com',
    'identity-deactivated@example.com',
    'identity-csrf-mismatch@example.com',
    'identity-concurrent@example.com',
  ];
  const tokens = 'abcdefghi'.split('').map((value) => value.repeat(43));
  const options: GetCurrentIdentityOptions = {
    sessionIdleTtlSeconds: 86_400,
    activityTouchIntervalSeconds: 900,
  };

  let testingModule: TestingModule;
  let prisma: PrismaService;
  let users: UserRepository;
  let sessions: SessionRepository;
  let csrfTokens: CsrfTokenDeriver;
  let tokenDigester: Sha256TokenDigester;
  let clock: MutableClock;
  let dependencies: GetCurrentIdentityDependencies;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [IdentityPersistenceModule],
    }).compile();
    await testingModule.init();

    prisma = testingModule.get(PrismaService);
    users = testingModule.get(UserRepository);
    sessions = testingModule.get(SessionRepository);
    csrfTokens = testingModule.get(CsrfTokenDeriver);
    tokenDigester = new Sha256TokenDigester();
    clock = new MutableClock(now);
    dependencies = {
      sessions,
      csrfTokens,
      tokenDigester,
      clock,
    };
  });

  beforeEach(async () => {
    await deleteTestData();
    clock.set(now);
  });

  afterAll(async () => {
    await deleteTestData();
    await testingModule.close();
  });

  it('resolves an administrator and extends activity without exposing digests', async () => {
    const userId = await createUser(emails[0], 'ACTIVE', true, true);
    await createSession(userId, tokens[0], {
      lastSeenAt: new Date('2026-08-15T22:45:00.000Z'),
    });

    const result = await useCase().execute({ sessionToken: tokens[0] });
    const stored = await prisma.session.findUniqueOrThrow({
      where: { tokenDigest: tokenDigester.digest(tokens[0]) },
    });

    expect(result).toEqual({
      user: {
        id: userId,
        displayName: 'Usuário da Identidade',
        emailVerified: true,
        platformRole: 'ADMIN',
      },
      session: {
        restricted: false,
        csrfToken: csrfTokens.derive(tokens[0]),
      },
    });
    expect(stored).toMatchObject({
      lastSeenAt: now,
      idleExpiresAt: new Date('2026-08-16T23:00:00.000Z'),
      csrfDigest: tokenDigester.digest(csrfTokens.derive(tokens[0])),
    });
    expect(JSON.stringify(result)).not.toContain(stored.tokenDigest);
    expect(JSON.stringify(result)).not.toContain(stored.csrfDigest);
  });

  it('returns an unverified member as restricted without an early activity write', async () => {
    const userId = await createUser(emails[1]);
    const lastSeenAt = new Date('2026-08-15T22:50:00.000Z');
    await createSession(userId, tokens[1], { lastSeenAt });

    await expect(
      useCase().execute({ sessionToken: tokens[1] }),
    ).resolves.toMatchObject({
      user: { emailVerified: false, platformRole: 'MEMBER' },
      session: { restricted: true },
    });
    await expect(
      prisma.session.findUnique({
        where: { tokenDigest: tokenDigester.digest(tokens[1]) },
      }),
    ).resolves.toMatchObject({ lastSeenAt });
  });

  it('uses the same failure for an absent or unknown session token', async () => {
    await expect(
      useCase().execute({ sessionToken: null }),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);
    await expect(
      useCase().execute({ sessionToken: 'z'.repeat(43) }),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it('uses one generic failure for expired, revoked and unavailable sessions', async () => {
    const idleExpiredId = await createUser(emails[2]);
    const absoluteExpiredId = await createUser(emails[3]);
    const revokedId = await createUser(emails[4]);
    const suspendedId = await createUser(emails[5], 'SUSPENDED');
    const deactivatedId = await createUser(emails[6], 'DEACTIVATED');
    await createSession(idleExpiredId, tokens[2], { idleExpiresAt: now });
    await createSession(absoluteExpiredId, tokens[3], {
      absoluteExpiresAt: now,
    });
    await createSession(revokedId, tokens[4]);
    await sessions.revoke(tokensDigest(4), now, 'SECURITY');
    await createSession(suspendedId, tokens[5]);
    await createSession(deactivatedId, tokens[6]);

    const results = await Promise.allSettled(
      tokens
        .slice(2, 7)
        .map((sessionToken) => useCase().execute({ sessionToken })),
    );

    expect(
      results.every(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof AuthenticationRequiredError,
      ),
    ).toBe(true);
  });

  it('rejects a session whose CSRF digest does not match its derivation', async () => {
    const userId = await createUser(emails[7]);
    await createSession(userId, tokens[7], {
      csrfDigest: tokenDigester.digest('unrelated-csrf-token'),
    });

    await expect(
      useCase().execute({ sessionToken: tokens[7] }),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);
    await expect(
      prisma.session.findUnique({ where: { tokenDigest: tokensDigest(7) } }),
    ).resolves.toMatchObject({
      lastSeenAt: new Date('2026-08-15T22:00:00.000Z'),
    });
  });

  it('keeps concurrent activity refreshes valid while performing one effective write', async () => {
    const userId = await createUser(emails[8], 'ACTIVE', true);
    await createSession(userId, tokens[8], {
      lastSeenAt: new Date('2026-08-15T22:30:00.000Z'),
    });

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        useCase().execute({ sessionToken: tokens[8] }),
      ),
    );

    expect(results).toHaveLength(8);
    expect(new Set(results.map((result) => result.session.csrfToken))).toEqual(
      new Set([csrfTokens.derive(tokens[8])]),
    );
    await expect(
      prisma.session.findUnique({ where: { tokenDigest: tokensDigest(8) } }),
    ).resolves.toMatchObject({
      lastSeenAt: now,
      idleExpiresAt: new Date('2026-08-16T23:00:00.000Z'),
    });
  });

  function useCase(): GetCurrentIdentity {
    return new GetCurrentIdentity(dependencies, options);
  }

  async function createUser(
    email: string,
    status: UserStatus = 'ACTIVE',
    verified = false,
    administrator = false,
  ): Promise<string> {
    const user = await users.create({
      displayName: 'Usuário da Identidade',
      email: EmailAddress.create(email),
      passwordHash: 'unused-test-hash',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: new Date('2026-08-15T21:00:00.000Z'),
    });

    if (status !== 'ACTIVE') {
      await users.updateStatus(user.id, status);
    }

    if (verified) {
      await users.markEmailVerified(user.id, now);
    }

    if (administrator) {
      await prisma.user.update({
        where: { id: user.id },
        data: { platformRole: 'ADMIN' },
      });
    }

    return user.id;
  }

  async function createSession(
    userId: string,
    sessionToken: string,
    overrides: Partial<{
      lastSeenAt: Date;
      idleExpiresAt: Date;
      absoluteExpiresAt: Date;
      csrfDigest: string;
    }> = {},
  ): Promise<void> {
    const createdAt =
      overrides.lastSeenAt ?? new Date('2026-08-15T22:00:00.000Z');
    const tokenDigest = tokenDigester.digest(sessionToken);
    await sessions.create({
      userId,
      tokenDigest,
      csrfDigest:
        overrides.csrfDigest ??
        tokenDigester.digest(csrfTokens.derive(sessionToken)),
      createdAt,
      idleExpiresAt:
        overrides.idleExpiresAt ?? new Date('2026-08-16T22:00:00.000Z'),
      absoluteExpiresAt:
        overrides.absoluteExpiresAt ?? new Date('2026-08-22T22:00:00.000Z'),
    });
  }

  function tokensDigest(index: number): string {
    return tokenDigester.digest(tokens[index]);
  }

  async function deleteTestData(): Promise<void> {
    await prisma.session.deleteMany({
      where: { user: { email: { in: emails } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
});

class MutableClock extends Clock {
  constructor(private value: Date) {
    super();
  }

  now(): Date {
    return new Date(this.value);
  }

  set(value: Date): void {
    this.value = new Date(value);
  }
}
