import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationRequiredError } from '../src/identity/application/errors/authentication-required.error';
import { GetCurrentIdentity } from '../src/identity/application/get-current-identity';
import {
  LogoutSession,
  LogoutSessionDependencies,
} from '../src/identity/application/logout-session';
import { Clock } from '../src/identity/application/ports/clock';
import { CsrfTokenDeriver } from '../src/identity/application/ports/csrf-token-deriver';
import { SessionRepository } from '../src/identity/application/ports/session-repository';
import { UserRepository } from '../src/identity/application/ports/user-repository';
import { EmailAddress } from '../src/identity/domain/email-address';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { Sha256TokenDigester } from '../src/identity/infrastructure/security/sha256-token-digester';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('LogoutSession integration', () => {
  const now = new Date('2026-08-16T11:00:00.000Z');
  const emails = [
    'logout-current@example.com',
    'logout-concurrent@example.com',
    'logout-suspended@example.com',
  ];
  const tokens = ['l'.repeat(43), 'm'.repeat(43), 'n'.repeat(43)];

  let testingModule: TestingModule;
  let prisma: PrismaService;
  let users: UserRepository;
  let sessions: SessionRepository;
  let csrfTokens: CsrfTokenDeriver;
  let tokenDigester: Sha256TokenDigester;
  let clock: MutableClock;
  let dependencies: LogoutSessionDependencies;

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
    dependencies = { sessions, tokenDigester, clock };
  });

  beforeEach(async () => {
    await deleteTestData();
    clock.set(now);
  });

  afterAll(async () => {
    await deleteTestData();
    await testingModule.close();
  });

  it('revokes the current session and denies reuse of the old cookie', async () => {
    const userId = await createUser(emails[0], true);
    await createSession(userId, tokens[0]);
    const currentIdentity = identityUseCase();
    await expect(
      currentIdentity.execute({ sessionToken: tokens[0] }),
    ).resolves.toMatchObject({ user: { id: userId } });

    await expect(
      useCase().execute({ sessionToken: tokens[0] }),
    ).resolves.toEqual({ accepted: true, revoked: true });
    await expect(
      currentIdentity.execute({ sessionToken: tokens[0] }),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);
    await expect(storedSession(0)).resolves.toMatchObject({
      revokedAt: now,
      revokeReason: 'LOGOUT',
    });
  });

  it('keeps repeated logout idempotent without rewriting its evidence', async () => {
    const userId = await createUser(emails[0]);
    await createSession(userId, tokens[0]);
    await useCase().execute({ sessionToken: tokens[0] });
    clock.advanceBy(60_000);

    await expect(
      useCase().execute({ sessionToken: tokens[0] }),
    ).resolves.toEqual({ accepted: true, revoked: false });
    await expect(storedSession(0)).resolves.toMatchObject({
      revokedAt: now,
      revokeReason: 'LOGOUT',
    });
  });

  it('accepts absent, malformed and unknown cookies without altering sessions', async () => {
    const userId = await createUser(emails[0]);
    await createSession(userId, tokens[0]);

    const results = await Promise.all([
      useCase().execute({ sessionToken: null }),
      useCase().execute({ sessionToken: 'malformed' }),
      useCase().execute({ sessionToken: 'z'.repeat(43) }),
    ]);

    expect(results).toEqual(
      Array.from({ length: 3 }, () => ({ accepted: true, revoked: false })),
    );
    await expect(storedSession(0)).resolves.toMatchObject({
      revokedAt: null,
      revokeReason: null,
    });
  });

  it('allows exactly one effective revocation under concurrent logout', async () => {
    const userId = await createUser(emails[1]);
    await createSession(userId, tokens[1]);

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        useCase().execute({ sessionToken: tokens[1] }),
      ),
    );

    expect(results.filter((result) => result.revoked)).toHaveLength(1);
    expect(results.every((result) => result.accepted)).toBe(true);
    await expect(storedSession(1)).resolves.toMatchObject({
      revokedAt: now,
      revokeReason: 'LOGOUT',
    });
  });

  it('revokes a stored session even after its account becomes suspended', async () => {
    const userId = await createUser(emails[2]);
    await createSession(userId, tokens[2]);
    await users.updateStatus(userId, 'SUSPENDED');

    await expect(
      useCase().execute({ sessionToken: tokens[2] }),
    ).resolves.toEqual({ accepted: true, revoked: true });
    await expect(storedSession(2)).resolves.toMatchObject({
      revokedAt: now,
      revokeReason: 'LOGOUT',
    });
  });

  function useCase(): LogoutSession {
    return new LogoutSession(dependencies);
  }

  function identityUseCase(): GetCurrentIdentity {
    return new GetCurrentIdentity(
      { sessions, csrfTokens, tokenDigester, clock },
      {
        sessionIdleTtlSeconds: 86_400,
        activityTouchIntervalSeconds: 900,
      },
    );
  }

  async function createUser(email: string, verified = false): Promise<string> {
    const user = await users.create({
      displayName: 'Usuário de Logout',
      email: EmailAddress.create(email),
      passwordHash: 'unused-test-hash',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: new Date('2026-08-16T09:00:00.000Z'),
    });

    if (verified) {
      await users.markEmailVerified(user.id, now);
    }

    return user.id;
  }

  async function createSession(
    userId: string,
    sessionToken: string,
  ): Promise<void> {
    await sessions.create({
      userId,
      tokenDigest: tokenDigester.digest(sessionToken),
      csrfDigest: tokenDigester.digest(csrfTokens.derive(sessionToken)),
      createdAt: new Date('2026-08-16T10:30:00.000Z'),
      idleExpiresAt: new Date('2026-08-17T10:30:00.000Z'),
      absoluteExpiresAt: new Date('2026-08-23T10:30:00.000Z'),
    });
  }

  function storedSession(index: number) {
    return prisma.session.findUniqueOrThrow({
      where: { tokenDigest: tokenDigester.digest(tokens[index]) },
    });
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

  advanceBy(milliseconds: number): void {
    this.value = new Date(this.value.getTime() + milliseconds);
  }
}
