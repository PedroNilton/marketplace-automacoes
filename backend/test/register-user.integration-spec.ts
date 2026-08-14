import { Test, TestingModule } from '@nestjs/testing';
import { TransactionManager } from '../src/application/ports/transaction-manager';
import { AuthTokenRepository } from '../src/identity/application/ports/auth-token-repository';
import { Clock } from '../src/identity/application/ports/clock';
import { RateLimitKeyDigester } from '../src/identity/application/ports/rate-limit-key-digester';
import { RateLimitRepository } from '../src/identity/application/ports/rate-limit-repository';
import { UserRepository } from '../src/identity/application/ports/user-repository';
import { RateLimitDecisions } from '../src/identity/application/rate-limit-decisions';
import {
  RegisterUser,
  RegisterUserDependencies,
  RegisterUserInput,
  RegisterUserOptions,
} from '../src/identity/application/register-user';
import { EmailAddress } from '../src/identity/domain/email-address';
import { PasswordPolicy } from '../src/identity/domain/password-policy';
import { Argon2idPasswordHasher } from '../src/identity/infrastructure/password/argon2id-password-hasher';
import { LocalPasswordBlocklist } from '../src/identity/infrastructure/password/local-password-blocklist';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { NodeSecureTokenGenerator } from '../src/identity/infrastructure/security/node-secure-token-generator';
import { Sha256TokenDigester } from '../src/identity/infrastructure/security/sha256-token-digester';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('RegisterUser integration', () => {
  const now = new Date('2026-08-14T15:00:00.000Z');
  const rawToken = 'integration-verification-token';
  const emails = [
    'registration-valid@example.com',
    'registration-duplicate@example.com',
    'registration-concurrent@example.com',
    'registration-rollback@example.com',
    'registration-token-owner@example.com',
  ];
  const origins = [
    '203.0.113.101',
    '203.0.113.102',
    '203.0.113.103',
    '203.0.113.104',
  ];
  const options: RegisterUserOptions = {
    currentTermsVersion: 'terms-v1',
    currentPrivacyVersion: 'privacy-v1',
    verificationTokenTtlSeconds: 86_400,
    rateLimit: {
      windowDurationSeconds: 3_600,
      maximumAttempts: 100,
      blockDurationSeconds: 900,
    },
  };

  let testingModule: TestingModule;
  let prisma: PrismaService;
  let users: UserRepository;
  let authTokens: AuthTokenRepository;
  let rateLimitKeyDigester: RateLimitKeyDigester;
  let dependencies: RegisterUserDependencies;
  let passwordHasher: Argon2idPasswordHasher;
  let tokenDigester: Sha256TokenDigester;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [IdentityPersistenceModule],
    }).compile();
    await testingModule.init();

    prisma = testingModule.get(PrismaService);
    users = testingModule.get(UserRepository);
    authTokens = testingModule.get(AuthTokenRepository);
    rateLimitKeyDigester = testingModule.get(RateLimitKeyDigester);
    passwordHasher = new Argon2idPasswordHasher({
      memoryCostKiB: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    tokenDigester = new Sha256TokenDigester();
    const clock = new FixedClock(now);
    dependencies = {
      users,
      authTokens,
      transactions: testingModule.get(TransactionManager),
      passwordPolicy: new PasswordPolicy(new LocalPasswordBlocklist()),
      passwordHasher,
      secureTokens: new FixedTokenGenerator(rawToken),
      tokenDigester,
      rateLimits: testingModule.get(RateLimitRepository),
      rateLimitKeyDigester,
      rateLimitDecisions: new RateLimitDecisions(clock),
      clock,
    };
  });

  beforeEach(async () => {
    await deleteTestData();
  });

  afterAll(async () => {
    await deleteTestData();
    await testingModule.close();
  });

  it('persists one protected account and one digested verification token', async () => {
    const result = await useCase().execute(input(emails[0], origins[0]));
    const user = await users.findByEmail(EmailAddress.create(emails[0]));
    const persistedTokens = await prisma.authToken.findMany({
      where: { userId: user?.id },
    });

    expect(result.verification).toEqual({
      recipient: emails[0],
      displayName: 'Mariana Souza',
      token: rawToken,
      expiresAt: new Date('2026-08-15T15:00:00.000Z'),
    });
    expect(user).toMatchObject({
      displayName: 'Mariana Souza',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: now,
      emailVerifiedAt: null,
      platformRole: 'MEMBER',
    });
    await expect(
      passwordHasher.verify(
        user?.passwordHash ?? '',
        'uma frase secreta longa',
      ),
    ).resolves.toBe(true);
    expect(persistedTokens).toEqual([
      expect.objectContaining({
        purpose: 'EMAIL_VERIFICATION',
        tokenDigest: tokenDigester.digest(rawToken),
        createdAt: now,
        expiresAt: new Date('2026-08-15T15:00:00.000Z'),
      }),
    ]);
    expect(JSON.stringify(persistedTokens)).not.toContain(rawToken);
  });

  it('keeps the response neutral and preserves the original password on duplicate email', async () => {
    await useCase().execute(input(emails[1], origins[1]));
    const duplicate = await useCase().execute({
      ...input(emails[1].toUpperCase(), origins[1]),
      password: 'uma segunda frase secreta',
      passwordConfirmation: 'uma segunda frase secreta',
    });
    const user = await users.findByEmail(EmailAddress.create(emails[1]));

    expect(duplicate).toEqual({ accepted: true, verification: null });
    await expect(
      passwordHasher.verify(
        user?.passwordHash ?? '',
        'uma frase secreta longa',
      ),
    ).resolves.toBe(true);
    await expect(
      passwordHasher.verify(
        user?.passwordHash ?? '',
        'uma segunda frase secreta',
      ),
    ).resolves.toBe(false);
    await expect(
      prisma.user.count({ where: { email: emails[1] } }),
    ).resolves.toBe(1);
  });

  it('allows exactly one account and token under concurrent duplicate requests', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        useCase().execute(input(emails[2], origins[2])),
      ),
    );
    const user = await users.findByEmail(EmailAddress.create(emails[2]));

    expect(
      results.filter((result) => result.verification !== null),
    ).toHaveLength(1);
    await expect(
      prisma.user.count({ where: { email: emails[2] } }),
    ).resolves.toBe(1);
    await expect(
      prisma.authToken.count({ where: { userId: user?.id } }),
    ).resolves.toBe(1);
  });

  it('rolls the account back when verification token persistence fails', async () => {
    const tokenOwner = await users.create({
      displayName: 'Token Owner',
      email: EmailAddress.create(emails[4]),
      passwordHash: 'unused-test-hash',
      termsVersion: 'terms-v1',
      privacyVersion: 'privacy-v1',
      legalAcceptedAt: now,
    });
    await authTokens.issue({
      userId: tokenOwner.id,
      purpose: 'EMAIL_VERIFICATION',
      tokenDigest: tokenDigester.digest(rawToken),
      createdAt: now,
      expiresAt: new Date('2026-08-15T15:00:00.000Z'),
    });

    await expect(
      useCase().execute(input(emails[3], origins[3])),
    ).rejects.toMatchObject({ code: 'UNIQUE_CONSTRAINT_VIOLATION' });
    await expect(
      users.findByEmail(EmailAddress.create(emails[3])),
    ).resolves.toBeNull();
  });

  function useCase(): RegisterUser {
    return new RegisterUser(dependencies, options);
  }

  async function deleteTestData(): Promise<void> {
    await prisma.authToken.deleteMany({
      where: { user: { email: { in: emails } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });

    const digests = [
      ...emails.map((email) =>
        rateLimitKeyDigester.digest('REGISTRATION', 'ACCOUNT', email),
      ),
      ...origins.map((origin) =>
        rateLimitKeyDigester.digest('REGISTRATION', 'ORIGIN', origin),
      ),
    ];
    await prisma.authRateLimit.deleteMany({
      where: { action: 'REGISTRATION', keyDigest: { in: digests } },
    });
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

class FixedTokenGenerator extends NodeSecureTokenGenerator {
  constructor(private readonly value: string) {
    super();
  }

  override generate(): string {
    return this.value;
  }
}

function input(email: string, originIdentifier: string): RegisterUserInput {
  return {
    displayName: 'Mariana Souza',
    email,
    password: 'uma frase secreta longa',
    passwordConfirmation: 'uma frase secreta longa',
    termsVersion: 'terms-v1',
    privacyVersion: 'privacy-v1',
    originIdentifier,
  };
}
