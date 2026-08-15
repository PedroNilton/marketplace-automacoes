import { Test, TestingModule } from '@nestjs/testing';
import { TransactionManager } from '../src/application/ports/transaction-manager';
import { AccountUnavailableError } from '../src/identity/application/errors/account-unavailable.error';
import { InvalidLoginCredentialsError } from '../src/identity/application/errors/invalid-login-credentials.error';
import { LoginRateLimitExceededError } from '../src/identity/application/errors/login-rate-limit-exceeded.error';
import {
  LoginUser,
  LoginUserDependencies,
  LoginUserOptions,
} from '../src/identity/application/login-user';
import { Clock } from '../src/identity/application/ports/clock';
import { RateLimitKeyDigester } from '../src/identity/application/ports/rate-limit-key-digester';
import { RateLimitRepository } from '../src/identity/application/ports/rate-limit-repository';
import { SecureTokenGenerator } from '../src/identity/application/ports/secure-token-generator';
import { SessionRepository } from '../src/identity/application/ports/session-repository';
import { UserRepository } from '../src/identity/application/ports/user-repository';
import { RateLimitDecisions } from '../src/identity/application/rate-limit-decisions';
import { EmailAddress } from '../src/identity/domain/email-address';
import { UserStatus } from '../src/identity/domain/user-account';
import { Argon2idPasswordHasher } from '../src/identity/infrastructure/password/argon2id-password-hasher';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { Sha256TokenDigester } from '../src/identity/infrastructure/security/sha256-token-digester';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('LoginUser integration', () => {
  const now = new Date('2026-08-15T21:00:00.000Z');
  const password = 'uma frase secreta longa 🔐';
  const emails = [
    'login-verified@example.com',
    'login-unverified@example.com',
    'login-missing@example.com',
    'login-suspended@example.com',
    'login-deactivated@example.com',
    'login-limited@example.com',
    'login-reset-limit@example.com',
  ];
  const origins = [
    '203.0.113.211',
    '203.0.113.212',
    '203.0.113.213',
    '203.0.113.214',
    '203.0.113.215',
    '203.0.113.216',
    '203.0.113.217',
  ];

  let testingModule: TestingModule;
  let prisma: PrismaService;
  let users: UserRepository;
  let sessions: SessionRepository;
  let rateLimitKeyDigester: RateLimitKeyDigester;
  let passwordHasher: Argon2idPasswordHasher;
  let tokenDigester: Sha256TokenDigester;
  let secureTokens: SequentialTokenGenerator;
  let clock: MutableClock;
  let dependencies: LoginUserDependencies;
  let options: LoginUserOptions;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [IdentityPersistenceModule],
    }).compile();
    await testingModule.init();

    prisma = testingModule.get(PrismaService);
    users = testingModule.get(UserRepository);
    sessions = testingModule.get(SessionRepository);
    rateLimitKeyDigester = testingModule.get(RateLimitKeyDigester);
    passwordHasher = new Argon2idPasswordHasher({
      memoryCostKiB: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    tokenDigester = new Sha256TokenDigester();
    secureTokens = new SequentialTokenGenerator();
    clock = new MutableClock(now);
    options = {
      sessionAbsoluteTtlSeconds: 604_800,
      sessionIdleTtlSeconds: 86_400,
      dummyPasswordHash: await passwordHasher.hash(
        'credencial fictícia somente para equivalência temporal',
      ),
      rateLimit: {
        windowDurationSeconds: 900,
        maximumAttempts: 3,
        blockDurationSeconds: 300,
      },
    };
    dependencies = {
      users,
      sessions,
      transactions: testingModule.get(TransactionManager),
      passwordHasher,
      secureTokens,
      tokenDigester,
      rateLimits: testingModule.get(RateLimitRepository),
      rateLimitKeyDigester,
      rateLimitDecisions: new RateLimitDecisions(clock),
      clock,
    };
  });

  beforeEach(async () => {
    await deleteTestData();
    secureTokens.reset();
    clock.set(now);
  });

  afterAll(async () => {
    await deleteTestData();
    await testingModule.close();
  });

  it('verifies Argon2id and persists only digests for a verified session', async () => {
    const userId = await createUser(emails[0], 'ACTIVE', true);

    const result = await useCase().execute({
      email: ` ${emails[0].toUpperCase()} `,
      password,
      returnTo: '/ofertas/42/solicitar',
      originIdentifier: origins[0],
    });
    const stored = await prisma.session.findFirstOrThrow({
      where: { userId },
    });

    expect(result).toEqual({
      user: {
        id: userId,
        displayName: 'Usuário de Login',
        emailVerified: true,
        platformRole: 'MEMBER',
      },
      session: {
        token: 'login-token-1',
        csrfToken: 'login-token-2',
        restricted: false,
        returnTo: '/ofertas/42/solicitar',
        idleExpiresAt: new Date('2026-08-16T21:00:00.000Z'),
        absoluteExpiresAt: new Date('2026-08-22T21:00:00.000Z'),
      },
    });
    expect(stored).toMatchObject({
      userId,
      tokenDigest: tokenDigester.digest('login-token-1'),
      csrfDigest: tokenDigester.digest('login-token-2'),
      createdAt: now,
      lastSeenAt: now,
      idleExpiresAt: new Date('2026-08-16T21:00:00.000Z'),
      absoluteExpiresAt: new Date('2026-08-22T21:00:00.000Z'),
      revokedAt: null,
    });
    expect(JSON.stringify(stored)).not.toContain('login-token-');
  });

  it('creates a restricted session for an active account awaiting verification', async () => {
    await createUser(emails[1]);

    await expect(
      useCase().execute({
        email: emails[1],
        password,
        returnTo: '/conta',
        originIdentifier: origins[1],
      }),
    ).resolves.toMatchObject({
      user: { emailVerified: false },
      session: { restricted: true, returnTo: '/verificar-email' },
    });
  });

  it('keeps missing accounts and wrong passwords under the same failure contract', async () => {
    await createUser(emails[0], 'ACTIVE', true);

    const results = await Promise.allSettled([
      useCase().execute({
        email: emails[2],
        password,
        originIdentifier: origins[2],
      }),
      useCase().execute({
        email: emails[0],
        password: 'senha incorreta longa',
        originIdentifier: origins[2],
      }),
    ]);

    expect(
      results.every(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof InvalidLoginCredentialsError,
      ),
    ).toBe(true);
    await expect(prisma.session.count()).resolves.toBe(0);
  });

  it.each([
    [emails[3], origins[3], 'SUSPENDED'],
    [emails[4], origins[4], 'DEACTIVATED'],
  ] as const)(
    'rejects valid credentials for an unavailable %s account',
    async (email, originIdentifier, status) => {
      await createUser(email, status);

      await expect(
        useCase().execute({ email, password, originIdentifier }),
      ).rejects.toBeInstanceOf(AccountUnavailableError);
      await expect(
        prisma.session.count({ where: { user: { email } } }),
      ).resolves.toBe(0);
    },
  );

  it('blocks the attempt after the configured failure threshold', async () => {
    const userId = await createUser(emails[5]);

    for (
      let attempt = 0;
      attempt < options.rateLimit.maximumAttempts;
      attempt += 1
    ) {
      await expect(
        useCase().execute({
          email: emails[5],
          password: 'senha incorreta longa',
          originIdentifier: origins[5],
        }),
      ).rejects.toBeInstanceOf(InvalidLoginCredentialsError);
    }

    await expect(
      useCase().execute({
        email: emails[5],
        password,
        originIdentifier: origins[5],
      }),
    ).rejects.toEqual(new LoginRateLimitExceededError(300));
    await expect(prisma.session.count({ where: { userId } })).resolves.toBe(0);
  });

  it('removes account and origin counters after a successful login', async () => {
    await createUser(emails[6], 'ACTIVE', true);

    await expect(
      useCase().execute({
        email: emails[6],
        password: 'senha incorreta longa',
        originIdentifier: origins[6],
      }),
    ).rejects.toBeInstanceOf(InvalidLoginCredentialsError);

    clock.advanceBy(1_000);
    await useCase().execute({
      email: emails[6],
      password,
      originIdentifier: origins[6],
    });

    const keyDigests = rateLimitDigests(emails[6], origins[6]);
    await expect(
      prisma.authRateLimit.count({
        where: { action: 'LOGIN', keyDigest: { in: keyDigests } },
      }),
    ).resolves.toBe(0);
  });

  function useCase(): LoginUser {
    return new LoginUser(dependencies, options);
  }

  async function createUser(
    email: string,
    status: UserStatus = 'ACTIVE',
    verified = false,
  ): Promise<string> {
    const user = await users.create({
      displayName: 'Usuário de Login',
      email: EmailAddress.create(email),
      passwordHash: await passwordHasher.hash(password),
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: new Date('2026-08-15T20:00:00.000Z'),
    });

    if (status !== 'ACTIVE') {
      await users.updateStatus(user.id, status);
    }

    if (verified) {
      await users.markEmailVerified(user.id, now);
    }

    return user.id;
  }

  function rateLimitDigests(email: string, origin: string): string[] {
    return [
      rateLimitKeyDigester.digest('LOGIN', 'ACCOUNT', email),
      rateLimitKeyDigester.digest('LOGIN', 'ORIGIN', origin),
    ];
  }

  async function deleteTestData(): Promise<void> {
    await prisma.session.deleteMany({
      where: { user: { email: { in: emails } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    const digests = emails.flatMap((email, index) =>
      rateLimitDigests(email, origins[index] ?? ''),
    );
    await prisma.authRateLimit.deleteMany({
      where: { action: 'LOGIN', keyDigest: { in: digests } },
    });
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

class SequentialTokenGenerator extends SecureTokenGenerator {
  private sequence = 0;

  generate(): string {
    this.sequence += 1;
    return `login-token-${this.sequence}`;
  }

  reset(): void {
    this.sequence = 0;
  }
}
