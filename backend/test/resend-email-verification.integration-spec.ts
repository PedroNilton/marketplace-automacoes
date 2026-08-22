import { Test, TestingModule } from '@nestjs/testing';
import { TransactionManager } from '../src/application/ports/transaction-manager';
import { EmailVerificationResendRateLimitExceededError } from '../src/identity/application/errors/email-verification-resend-rate-limit-exceeded.error';
import { AuthTokenRepository } from '../src/identity/application/ports/auth-token-repository';
import { Clock } from '../src/identity/application/ports/clock';
import { RateLimitKeyDigester } from '../src/identity/application/ports/rate-limit-key-digester';
import { RateLimitRepository } from '../src/identity/application/ports/rate-limit-repository';
import { SecureTokenGenerator } from '../src/identity/application/ports/secure-token-generator';
import { UserRepository } from '../src/identity/application/ports/user-repository';
import { RateLimitDecisions } from '../src/identity/application/rate-limit-decisions';
import {
  ResendEmailVerification,
  ResendEmailVerificationDependencies,
  ResendEmailVerificationOptions,
} from '../src/identity/application/resend-email-verification';
import { EmailAddress } from '../src/identity/domain/email-address';
import { UserStatus } from '../src/identity/domain/user-account';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { Sha256TokenDigester } from '../src/identity/infrastructure/security/sha256-token-digester';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('ResendEmailVerification integration', () => {
  const initialTime = new Date('2026-08-15T18:00:00.000Z');
  const emails = [
    'resend-success@example.com',
    'resend-missing@example.com',
    'resend-verified@example.com',
    'resend-suspended@example.com',
    'resend-deactivated@example.com',
    'resend-cooldown@example.com',
    'resend-concurrent@example.com',
    'resend-daily@example.com',
  ];
  const origins = [
    '203.0.113.201',
    '203.0.113.202',
    '203.0.113.203',
    '203.0.113.204',
    '203.0.113.205',
    '203.0.113.206',
    '203.0.113.207',
    '203.0.113.208',
  ];
  const options: ResendEmailVerificationOptions = {
    verificationTokenTtlSeconds: 3_600,
    cooldownSeconds: 60,
    maximumAttemptsPerDay: 3,
    dailyWindowDurationSeconds: 86_400,
  };

  let testingModule: TestingModule;
  let prisma: PrismaService;
  let users: UserRepository;
  let authTokens: AuthTokenRepository;
  let rateLimitKeyDigester: RateLimitKeyDigester;
  let tokenDigester: Sha256TokenDigester;
  let clock: MutableClock;
  let secureTokens: SequentialTokenGenerator;
  let dependencies: ResendEmailVerificationDependencies;

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
    clock = new MutableClock(initialTime);
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
    clock.set(initialTime);
    secureTokens.reset();
  });

  afterAll(async () => {
    await deleteTestData();
    await testingModule.close();
  });

  it('replaces the previous token after cooldown and returns an internal delivery request', async () => {
    const userId = await createUser(emails[0]);
    const previousToken = 'previous-verification-token';
    await issueToken(
      userId,
      previousToken,
      new Date('2026-08-15T17:58:59.000Z'),
    );

    const result = await useCase().execute({
      email: emails[0],
      originIdentifier: origins[0],
    });
    const stored = await prisma.authToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    expect(result).toEqual({
      accepted: true,
      verification: {
        recipient: emails[0],
        displayName: 'Usuário de Reenvio',
        token: 'resent-token-1',
        expiresAt: new Date('2026-08-15T19:00:00.000Z'),
      },
    });
    expect(stored).toEqual([
      expect.objectContaining({
        tokenDigest: tokenDigester.digest(previousToken),
        invalidatedAt: initialTime,
      }),
      expect.objectContaining({
        tokenDigest: tokenDigester.digest('resent-token-1'),
        createdAt: initialTime,
        expiresAt: new Date('2026-08-15T19:00:00.000Z'),
        invalidatedAt: null,
      }),
    ]);
    expect(JSON.stringify(stored)).not.toContain('resent-token-1');
  });

  it('returns an equivalent neutral result for missing or ineligible accounts', async () => {
    const verifiedId = await createUser(emails[2]);
    await users.markEmailVerified(verifiedId, initialTime);
    await createUser(emails[3], 'SUSPENDED');
    await createUser(emails[4], 'DEACTIVATED');

    const results = await Promise.all([
      useCase().execute({
        email: emails[1],
        originIdentifier: origins[1],
      }),
      useCase().execute({
        email: emails[2],
        originIdentifier: origins[2],
      }),
      useCase().execute({
        email: emails[3],
        originIdentifier: origins[3],
      }),
      useCase().execute({
        email: emails[4],
        originIdentifier: origins[4],
      }),
    ]);

    expect(results).toEqual(
      Array.from({ length: 4 }, () => ({
        accepted: true,
        verification: null,
      })),
    );
    await expect(
      prisma.authToken.count({
        where: { user: { email: { in: emails.slice(1, 5) } } },
      }),
    ).resolves.toBe(0);
  });

  it('does not replace a token before the emission cooldown expires', async () => {
    const userId = await createUser(emails[5]);
    const previousToken = 'recent-verification-token';
    await issueToken(
      userId,
      previousToken,
      new Date('2026-08-15T17:59:30.000Z'),
    );

    await expect(
      useCase().execute({
        email: emails[5],
        originIdentifier: origins[5],
      }),
    ).resolves.toEqual({ accepted: true, verification: null });
    await expect(
      prisma.authToken.findUnique({
        where: { tokenDigest: tokenDigester.digest(previousToken) },
      }),
    ).resolves.toMatchObject({ invalidatedAt: null });
    await expect(prisma.authToken.count({ where: { userId } })).resolves.toBe(
      1,
    );
  });

  it('allows exactly one winner under concurrent resend attempts', async () => {
    const userId = await createUser(emails[6]);

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        useCase().execute({
          email: emails[6],
          originIdentifier: origins[6],
        }),
      ),
    );
    const fulfilled = results.filter(
      (
        result,
      ): result is PromiseFulfilledResult<
        Awaited<ReturnType<ResendEmailVerification['execute']>>
      > => result.status === 'fulfilled',
    );
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0].value.verification).not.toBeNull();
    expect(rejected).toHaveLength(7);
    expect(
      rejected.every(
        (result) =>
          result.reason instanceof
          EmailVerificationResendRateLimitExceededError,
      ),
    ).toBe(true);
    await expect(prisma.authToken.count({ where: { userId } })).resolves.toBe(
      1,
    );
  });

  it('enforces the daily maximum without extending the token cooldown', async () => {
    const userId = await createUser(emails[7]);

    for (
      let attempt = 0;
      attempt < options.maximumAttemptsPerDay;
      attempt += 1
    ) {
      const result = await useCase().execute({
        email: emails[7],
        originIdentifier: origins[7],
      });
      expect(result.verification).not.toBeNull();
      clock.advanceBy(options.cooldownSeconds * 1_000);
    }

    await expect(
      useCase().execute({
        email: emails[7],
        originIdentifier: origins[7],
      }),
    ).rejects.toBeInstanceOf(EmailVerificationResendRateLimitExceededError);
    await expect(prisma.authToken.count({ where: { userId } })).resolves.toBe(
      options.maximumAttemptsPerDay,
    );
  });

  function useCase(): ResendEmailVerification {
    return new ResendEmailVerification(dependencies, options);
  }

  async function createUser(
    email: string,
    status: UserStatus = 'ACTIVE',
  ): Promise<string> {
    const user = await users.create({
      displayName: 'Usuário de Reenvio',
      email: EmailAddress.create(email),
      passwordHash: 'unused-test-hash',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: new Date('2026-08-15T17:00:00.000Z'),
    });

    if (status !== 'ACTIVE') {
      await users.updateStatus(user.id, status);
    }

    return user.id;
  }

  function issueToken(userId: string, rawToken: string, createdAt: Date) {
    return authTokens.issue({
      userId,
      purpose: 'EMAIL_VERIFICATION',
      tokenDigest: tokenDigester.digest(rawToken),
      createdAt,
      expiresAt: new Date(createdAt.getTime() + 3_600_000),
    });
  }

  async function deleteTestData(): Promise<void> {
    await prisma.authToken.deleteMany({
      where: { user: { email: { in: emails } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });

    const digests = [
      ...emails.flatMap((email) =>
        ['cooldown', 'daily'].map((namespace) =>
          rateLimitKeyDigester.digest(
            'EMAIL_RESEND',
            'ACCOUNT',
            `${namespace}:${email}`,
          ),
        ),
      ),
      ...origins.flatMap((origin) =>
        ['cooldown', 'daily'].map((namespace) =>
          rateLimitKeyDigester.digest(
            'EMAIL_RESEND',
            'ORIGIN',
            `${namespace}:${origin}`,
          ),
        ),
      ),
    ];
    await prisma.authRateLimit.deleteMany({
      where: { action: 'EMAIL_RESEND', keyDigest: { in: digests } },
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
    return `resent-token-${this.sequence}`;
  }

  reset(): void {
    this.sequence = 0;
  }
}
