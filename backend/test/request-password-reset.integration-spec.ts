import { Test, TestingModule } from '@nestjs/testing';
import { TransactionManager } from '../src/application/ports/transaction-manager';
import { PasswordResetRateLimitExceededError } from '../src/identity/application/errors/password-reset-rate-limit-exceeded.error';
import { AuthTokenRepository } from '../src/identity/application/ports/auth-token-repository';
import { Clock } from '../src/identity/application/ports/clock';
import { RateLimitKeyDigester } from '../src/identity/application/ports/rate-limit-key-digester';
import { RateLimitRepository } from '../src/identity/application/ports/rate-limit-repository';
import { SecureTokenGenerator } from '../src/identity/application/ports/secure-token-generator';
import { UserRepository } from '../src/identity/application/ports/user-repository';
import { RateLimitDecisions } from '../src/identity/application/rate-limit-decisions';
import {
  RequestPasswordReset,
  RequestPasswordResetDependencies,
  RequestPasswordResetOptions,
} from '../src/identity/application/request-password-reset';
import { EmailAddress } from '../src/identity/domain/email-address';
import { UserStatus } from '../src/identity/domain/user-account';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { Sha256TokenDigester } from '../src/identity/infrastructure/security/sha256-token-digester';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('RequestPasswordReset integration', () => {
  const now = new Date('2026-08-16T14:00:00.000Z');
  const emails = [
    'password-reset-active@example.com',
    'password-reset-missing@example.com',
    'password-reset-suspended@example.com',
    'password-reset-deactivated@example.com',
    'password-reset-repeated@example.com',
    'password-reset-limited@example.com',
    'password-reset-concurrent@example.com',
  ];
  const origins = [
    '203.0.113.220',
    '203.0.113.221',
    '203.0.113.222',
    '203.0.113.223',
    '203.0.113.224',
    '203.0.113.225',
    '203.0.113.226',
  ];
  const options: RequestPasswordResetOptions = {
    resetTokenTtlSeconds: 1_800,
    maximumAttemptsPerHour: 3,
    hourlyWindowDurationSeconds: 3_600,
  };

  let testingModule: TestingModule;
  let prisma: PrismaService;
  let users: UserRepository;
  let authTokens: AuthTokenRepository;
  let rateLimitKeyDigester: RateLimitKeyDigester;
  let tokenDigester: Sha256TokenDigester;
  let clock: MutableClock;
  let secureTokens: SequentialTokenGenerator;
  let dependencies: RequestPasswordResetDependencies;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [IdentityPersistenceModule],
    }).compile();
    await testingModule.init();

    prisma = testingModule.get(PrismaService);
    users = testingModule.get(UserRepository);
    authTokens = testingModule.get(AuthTokenRepository);
    rateLimitKeyDigester = testingModule.get(RateLimitKeyDigester);
    tokenDigester = new Sha256TokenDigester();
    clock = new MutableClock(now);
    secureTokens = new SequentialTokenGenerator();
    dependencies = {
      users,
      authTokens,
      transactions: testingModule.get(TransactionManager),
      secureTokens,
      tokenDigester,
      rateLimits: testingModule.get(RateLimitRepository),
      rateLimitKeyDigester,
      rateLimitDecisions: new RateLimitDecisions(clock),
      clock,
      emailDelivery: noOpEmailDelivery(),
    };
  });

  beforeEach(async () => {
    await deleteTestData();
    clock.set(now);
    secureTokens.reset();
  });

  afterAll(async () => {
    await deleteTestData();
    await testingModule.close();
  });

  it('persists only the digest of an expiring reset token for an existing account', async () => {
    const userId = await createUser(emails[0]);

    const result = await useCase().execute({
      email: emails[0],
      originIdentifier: origins[0],
    });
    const stored = await prisma.authToken.findMany({ where: { userId } });

    expect(result).toEqual({
      accepted: true,
      reset: {
        recipient: emails[0],
        displayName: 'Usuário de Recuperação',
        token: 'password-reset-token-1',
        expiresAt: new Date('2026-08-16T14:30:00.000Z'),
      },
    });
    expect(stored).toEqual([
      expect.objectContaining({
        purpose: 'PASSWORD_RESET',
        tokenDigest: tokenDigester.digest('password-reset-token-1'),
        createdAt: now,
        expiresAt: new Date('2026-08-16T14:30:00.000Z'),
        consumedAt: null,
        invalidatedAt: null,
      }),
    ]);
    expect(JSON.stringify(stored)).not.toContain('password-reset-token-1');
  });

  it('accepts a missing account without creating recovery evidence', async () => {
    await expect(
      useCase().execute({
        email: emails[1],
        originIdentifier: origins[1],
      }),
    ).resolves.toEqual({ accepted: true, reset: null });
    await expect(
      prisma.authToken.count({ where: { user: { email: emails[1] } } }),
    ).resolves.toBe(0);
  });

  it.each<[UserStatus, number]>([
    ['SUSPENDED', 2],
    ['DEACTIVATED', 3],
  ])(
    'allows a %s account to recover without reactivating it',
    async (status, index) => {
      const userId = await createUser(emails[index], status);

      const result = await useCase().execute({
        email: emails[index],
        originIdentifier: origins[index],
      });

      expect(result.accepted).toBe(true);
      expect(typeof result.reset?.token).toBe('string');
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      ).resolves.toMatchObject({ status });
    },
  );

  it('invalidates the previous reset token without changing account state', async () => {
    const userId = await createUser(emails[4]);

    await useCase().execute({
      email: emails[4],
      originIdentifier: origins[4],
    });
    clock.advanceBy(1_000);
    await useCase().execute({
      email: emails[4],
      originIdentifier: origins[4],
    });
    const stored = await prisma.authToken.findMany({
      where: { userId, purpose: 'PASSWORD_RESET' },
      orderBy: { createdAt: 'asc' },
    });

    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({ invalidatedAt: clock.now() });
    expect(stored[1]).toMatchObject({ invalidatedAt: null });
    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ).resolves.toMatchObject({
      status: 'ACTIVE',
      passwordHash: 'unused-test-hash',
    });
  });

  it('allows the configured maximum and rejects the following request', async () => {
    const userId = await createUser(emails[5]);

    for (
      let attempt = 0;
      attempt < options.maximumAttemptsPerHour;
      attempt += 1
    ) {
      const result = await useCase().execute({
        email: emails[5],
        originIdentifier: origins[5],
      });

      expect(result.accepted).toBe(true);
      expect(typeof result.reset?.token).toBe('string');
    }

    await expect(
      useCase().execute({
        email: emails[5],
        originIdentifier: origins[5],
      }),
    ).rejects.toBeInstanceOf(PasswordResetRateLimitExceededError);
    await expect(prisma.authToken.count({ where: { userId } })).resolves.toBe(
      options.maximumAttemptsPerHour,
    );
  });

  it('admits exactly one request when concurrent attempts reach a limit of one', async () => {
    const userId = await createUser(emails[6]);
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        useCase({ maximumAttemptsPerHour: 1 }).execute({
          email: emails[6],
          originIdentifier: origins[6],
        }),
      ),
    );

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected',
        )
        .every(
          (result) =>
            result.reason instanceof PasswordResetRateLimitExceededError,
        ),
    ).toBe(true);
    await expect(prisma.authToken.count({ where: { userId } })).resolves.toBe(
      1,
    );
  });

  function useCase(
    overrides: Partial<RequestPasswordResetOptions> = {},
  ): RequestPasswordReset {
    return new RequestPasswordReset(dependencies, { ...options, ...overrides });
  }

  async function createUser(
    email: string,
    status: UserStatus = 'ACTIVE',
  ): Promise<string> {
    const user = await users.create({
      displayName: 'Usuário de Recuperação',
      email: EmailAddress.create(email),
      passwordHash: 'unused-test-hash',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: new Date('2026-08-16T13:00:00.000Z'),
    });

    if (status !== 'ACTIVE') {
      await users.updateStatus(user.id, status);
    }

    return user.id;
  }

  async function deleteTestData(): Promise<void> {
    await prisma.authToken.deleteMany({
      where: { user: { email: { in: emails } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });

    const digests = [
      ...emails.map((email) =>
        rateLimitKeyDigester.digest('PASSWORD_RESET', 'ACCOUNT', email),
      ),
      ...origins.map((origin) =>
        rateLimitKeyDigester.digest('PASSWORD_RESET', 'ORIGIN', origin),
      ),
    ];
    await prisma.authRateLimit.deleteMany({
      where: { action: 'PASSWORD_RESET', keyDigest: { in: digests } },
    });
  }
});

function noOpEmailDelivery() {
  return {
    sendEmailVerification: (): Promise<void> => Promise.resolve(),
    sendPasswordReset: (): Promise<void> => Promise.resolve(),
    sendPasswordChanged: (): Promise<void> => Promise.resolve(),
  };
}

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
    return `password-reset-token-${this.sequence}`;
  }

  reset(): void {
    this.sequence = 0;
  }
}
