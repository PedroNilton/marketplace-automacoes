import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitKeyDigester } from '../src/identity/application/ports/rate-limit-key-digester';
import { RateLimitRepository } from '../src/identity/application/ports/rate-limit-repository';
import { RateLimitAction } from '../src/identity/domain/rate-limit';
import { IdentityPersistenceModule } from '../src/identity/infrastructure/persistence/identity-persistence.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('PrismaRateLimitRepository', () => {
  const trackedDigests: string[] = [];
  const windowDurationSeconds = 3_600;
  const maximumAttempts = 5;
  const blockDurationSeconds = 900;
  const startedAt = new Date('2026-08-13T12:00:00.000Z');

  let testingModule: TestingModule;
  let repository: RateLimitRepository;
  let digester: RateLimitKeyDigester;
  let prisma: PrismaService;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [IdentityPersistenceModule],
    }).compile();

    await testingModule.init();
    repository = testingModule.get(RateLimitRepository);
    digester = testingModule.get(RateLimitKeyDigester);
    prisma = testingModule.get(PrismaService);
  });

  beforeEach(async () => {
    await deleteTestData();
  });

  afterAll(async () => {
    await deleteTestData();
    await testingModule.close();
  });

  it('creates a window without storing the raw account identifier', async () => {
    const identifier = 'rate-limit-user@example.com';
    const keyDigest = trackedDigest('LOGIN', 'ACCOUNT', identifier);

    const state = await register('LOGIN', keyDigest, startedAt);

    expect(state).toEqual({
      action: 'LOGIN',
      keyDigest,
      windowStartedAt: startedAt,
      attemptCount: 1,
      blockedUntil: null,
      updatedAt: startedAt,
    });
    const serialized = JSON.stringify(state);
    expect(serialized).not.toContain(identifier);
  });

  it('allows the configured maximum and blocks the following attempt', async () => {
    const keyDigest = trackedDigest(
      'LOGIN',
      'ACCOUNT',
      'threshold@example.com',
    );

    const states = [];
    for (let attempt = 0; attempt <= maximumAttempts; attempt += 1) {
      states.push(await register('LOGIN', keyDigest, startedAt));
    }

    expect(states.slice(0, maximumAttempts)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attemptCount: 1, blockedUntil: null }),
        expect.objectContaining({ attemptCount: 5, blockedUntil: null }),
      ]),
    );
    expect(states[maximumAttempts]).toMatchObject({
      attemptCount: 6,
      blockedUntil: new Date('2026-08-13T12:15:00.000Z'),
    });
  });

  it('does not increment or extend an active temporary block', async () => {
    const keyDigest = trackedDigest('LOGIN', 'ORIGIN', '203.0.113.20');
    for (let attempt = 0; attempt <= maximumAttempts; attempt += 1) {
      await register('LOGIN', keyDigest, startedAt);
    }

    const duringBlock = await register(
      'LOGIN',
      keyDigest,
      new Date('2026-08-13T12:05:00.000Z'),
    );

    expect(duringBlock).toMatchObject({
      attemptCount: 6,
      blockedUntil: new Date('2026-08-13T12:15:00.000Z'),
    });
  });

  it.each([
    ['window expiration', new Date('2026-08-13T13:00:00.000Z'), 1],
    ['block expiration', new Date('2026-08-13T12:15:00.000Z'), 6],
  ] as const)(
    'starts a fresh window at the exact %s boundary',
    async (_scenario, boundary, attemptsBeforeBoundary) => {
      const keyDigest = trackedDigest(
        'LOGIN',
        'ACCOUNT',
        `boundary-${attemptsBeforeBoundary}@example.com`,
      );
      for (let attempt = 0; attempt < attemptsBeforeBoundary; attempt += 1) {
        await register('LOGIN', keyDigest, startedAt);
      }

      await expect(
        register('LOGIN', keyDigest, boundary),
      ).resolves.toMatchObject({
        windowStartedAt: boundary,
        attemptCount: 1,
        blockedUntil: null,
      });
    },
  );

  it('keeps actions and digested scopes independent', async () => {
    const accountDigest = trackedDigest(
      'LOGIN',
      'ACCOUNT',
      'independent@example.com',
    );
    const originDigest = trackedDigest('LOGIN', 'ORIGIN', '203.0.113.30');
    const resetDigest = trackedDigest(
      'PASSWORD_RESET',
      'ACCOUNT',
      'independent@example.com',
    );

    const states = await Promise.all([
      register('LOGIN', accountDigest, startedAt),
      register('LOGIN', originDigest, startedAt),
      register('PASSWORD_RESET', resetDigest, startedAt),
    ]);

    expect(states.map((state) => state.attemptCount)).toEqual([1, 1, 1]);
  });

  it('counts concurrent attempts without losing updates', async () => {
    const keyDigest = trackedDigest('REGISTRATION', 'ORIGIN', '203.0.113.40');

    await Promise.all(
      Array.from({ length: 20 }, () =>
        register('REGISTRATION', keyDigest, startedAt, {
          maximumAttempts: 100,
        }),
      ),
    );

    await expect(
      prisma.authRateLimit.findUnique({
        where: { action_keyDigest: { action: 'REGISTRATION', keyDigest } },
      }),
    ).resolves.toMatchObject({ attemptCount: 20, blockedUntil: null });
  });

  it('returns one stable temporary block under concurrent excess', async () => {
    const keyDigest = trackedDigest(
      'AUTH_TOKEN_CONFIRMATION',
      'ORIGIN',
      '203.0.113.50',
    );

    const states = await Promise.all(
      Array.from({ length: 20 }, () =>
        register('AUTH_TOKEN_CONFIRMATION', keyDigest, startedAt),
      ),
    );

    expect(states.filter((state) => state.blockedUntil !== null)).toHaveLength(
      15,
    );
    expect(new Set(states.map((state) => state.attemptCount))).toEqual(
      new Set([1, 2, 3, 4, 5, 6]),
    );
    await expect(
      prisma.authRateLimit.findUnique({
        where: {
          action_keyDigest: {
            action: 'AUTH_TOKEN_CONFIRMATION',
            keyDigest,
          },
        },
      }),
    ).resolves.toMatchObject({
      attemptCount: 6,
      blockedUntil: new Date('2026-08-13T12:15:00.000Z'),
    });
  });

  it('resets one state idempotently', async () => {
    const keyDigest = trackedDigest(
      'PASSWORD_RESET',
      'ACCOUNT',
      'reset@example.com',
    );
    await register('PASSWORD_RESET', keyDigest, startedAt);

    await expect(repository.reset('PASSWORD_RESET', keyDigest)).resolves.toBe(
      true,
    );
    await expect(repository.reset('PASSWORD_RESET', keyDigest)).resolves.toBe(
      false,
    );
  });

  it.each([
    ['windowDurationSeconds', 0],
    ['maximumAttempts', -1],
    ['blockDurationSeconds', 1.5],
  ] as const)(
    'rejects an invalid %s before persistence',
    async (field, value) => {
      const keyDigest = trackedDigest('LOGIN', 'ORIGIN', `invalid-${field}`);

      await expect(
        register('LOGIN', keyDigest, startedAt, { [field]: value }),
      ).rejects.toBeInstanceOf(RangeError);
    },
  );

  function trackedDigest(
    action: RateLimitAction,
    scope: 'ACCOUNT' | 'ORIGIN',
    identifier: string,
  ): string {
    const digest = digester.digest(action, scope, identifier);
    trackedDigests.push(digest);
    return digest;
  }

  function register(
    action: RateLimitAction,
    keyDigest: string,
    attemptedAt: Date,
    overrides: Partial<{
      windowDurationSeconds: number;
      maximumAttempts: number;
      blockDurationSeconds: number;
    }> = {},
  ) {
    return repository.registerAttempt({
      action,
      keyDigest,
      attemptedAt,
      windowDurationSeconds:
        overrides.windowDurationSeconds ?? windowDurationSeconds,
      maximumAttempts: overrides.maximumAttempts ?? maximumAttempts,
      blockDurationSeconds:
        overrides.blockDurationSeconds ?? blockDurationSeconds,
    });
  }

  async function deleteTestData(): Promise<void> {
    if (trackedDigests.length === 0) {
      return;
    }

    await prisma.authRateLimit.deleteMany({
      where: { keyDigest: { in: trackedDigests.splice(0) } },
    });
  }
});
