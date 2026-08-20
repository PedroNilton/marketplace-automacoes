import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Clock } from '../src/identity/application/ports/clock';
import { PasswordHasher } from '../src/identity/application/ports/password-hasher';
import { RateLimitKeyDigester } from '../src/identity/application/ports/rate-limit-key-digester';
import { RateLimitRepository } from '../src/identity/application/ports/rate-limit-repository';
import {
  RateLimitAction,
  RateLimitKeyScope,
} from '../src/identity/domain/rate-limit';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

const NOW = new Date('2026-08-20T12:00:00.000Z');
const FRONTEND_ORIGIN = 'http://127.0.0.1:3000';
const RETRY_AFTER_SECONDS = 75;
const PASSWORD = 'segredo-que-nao-pode-compor-o-limite';
const EMAILS = {
  registration: 'http-limit-registration@example.com',
  login: 'http-limit-login@example.com',
  resend: 'http-limit-resend@example.com',
  reset: 'http-limit-reset@example.com',
} as const;

class FixedClock extends Clock {
  constructor(private current: Date) {
    super();
  }

  now(): Date {
    return new Date(this.current);
  }

  set(value: Date): void {
    this.current = new Date(value);
  }
}

describe('Identity HTTP rate limits', () => {
  let app: INestApplication<App>;
  let testingModule: TestingModule;
  let prisma: PrismaService;
  let rateLimits: RateLimitRepository;
  let rateLimitKeys: RateLimitKeyDigester;
  let keyDigestSpy: jest.SpyInstance<
    string,
    [RateLimitAction, RateLimitKeyScope, string]
  >;
  let consoleLogSpy: jest.SpyInstance;
  const clock = new FixedClock(NOW);
  const passwordHasher = {
    hash: jest.fn().mockResolvedValue('$argon2id$test-hash'),
    verify: jest.fn().mockResolvedValue(false),
  };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Clock)
      .useValue(clock)
      .overrideProvider(PasswordHasher)
      .useValue(passwordHasher)
      .compile();

    app = testingModule.createNestApplication();
    await app.init();

    prisma = testingModule.get(PrismaService);
    rateLimits = testingModule.get(RateLimitRepository);
    rateLimitKeys = testingModule.get(RateLimitKeyDigester);
    keyDigestSpy = jest.spyOn(rateLimitKeys, 'digest');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  beforeEach(async () => {
    clock.set(NOW);
    passwordHasher.hash.mockClear();
    passwordHasher.verify.mockClear();
    keyDigestSpy.mockClear();
    consoleLogSpy.mockClear();
    await deleteRateLimits();
  });

  afterAll(async () => {
    consoleLogSpy.mockRestore();
    keyDigestSpy.mockRestore();
    await deleteRateLimits();
    await app.close();
    await testingModule.close();
  });

  it('returns a stable 429 before Argon2id when a registration key is blocked', async () => {
    await block('REGISTRATION', EMAILS.registration);
    passwordHasher.hash.mockClear();
    keyDigestSpy.mockClear();

    const response = await request(app.getHttpServer())
      .post('/v1/auth/registrations')
      .set('Origin', FRONTEND_ORIGIN)
      .send({
        displayName: 'Pessoa de Teste',
        email: EMAILS.registration,
        password: PASSWORD,
        passwordConfirmation: PASSWORD,
        termsVersion: 'beta-1',
        privacyVersion: 'beta-1',
      })
      .expect(429)
      .expect('Retry-After', RETRY_AFTER_SECONDS.toString());

    expect(response.body as unknown).toMatchObject({
      status: 429,
      code: 'rate_limit_exceeded',
    });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expectRateLimitKeysNeverContain(PASSWORD);
  });

  it('returns a stable 429 before password verification when a login key is blocked', async () => {
    await block('LOGIN', EMAILS.login);
    passwordHasher.verify.mockClear();
    keyDigestSpy.mockClear();

    const response = await request(app.getHttpServer())
      .post('/v1/auth/sessions')
      .set('Origin', FRONTEND_ORIGIN)
      .send({ email: EMAILS.login, password: PASSWORD })
      .expect(429)
      .expect('Retry-After', RETRY_AFTER_SECONDS.toString());

    expect(response.body as unknown).toMatchObject({
      status: 429,
      code: 'rate_limit_exceeded',
    });
    expect(passwordHasher.verify).not.toHaveBeenCalled();
    expectRateLimitKeysNeverContain(PASSWORD);
  });

  it.each([
    ['EMAIL_RESEND', '/v1/auth/email-verifications/requests', EMAILS.resend],
    ['PASSWORD_RESET', '/v1/auth/password-resets/requests', EMAILS.reset],
  ] as const)(
    'returns 429 and Retry-After for the %s endpoint',
    async (action, path, email) => {
      await block(action, email);

      const response = await request(app.getHttpServer())
        .post(path)
        .set('Origin', FRONTEND_ORIGIN)
        .send({ email })
        .expect(429)
        .expect('Retry-After', RETRY_AFTER_SECONDS.toString());

      expect(response.body as unknown).toMatchObject({
        status: 429,
        code: 'rate_limit_exceeded',
      });
    },
  );

  async function block(
    action: RateLimitAction,
    identifier: string,
  ): Promise<void> {
    const rateLimitIdentifier =
      action === 'EMAIL_RESEND' ? `cooldown:${identifier}` : identifier;
    const keyDigest = rateLimitKeys.digest(
      action,
      'ACCOUNT',
      rateLimitIdentifier,
    );
    const input = {
      action,
      keyDigest,
      attemptedAt: clock.now(),
      windowDurationSeconds: 3_600,
      maximumAttempts: 1,
      blockDurationSeconds: RETRY_AFTER_SECONDS,
    };

    await rateLimits.registerAttempt(input);
    await rateLimits.registerAttempt(input);
  }

  function expectRateLimitKeysNeverContain(value: string): void {
    expect(keyDigestSpy).toHaveBeenCalled();
    expect(
      keyDigestSpy.mock.calls.map(([, , identifier]) => identifier),
    ).not.toContain(value);
    expect(JSON.stringify(keyDigestSpy.mock.calls)).not.toContain(value);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  }

  async function deleteRateLimits(): Promise<void> {
    await prisma.authRateLimit.deleteMany({
      where: {
        action: {
          in: ['LOGIN', 'REGISTRATION', 'EMAIL_RESEND', 'PASSWORD_RESET'],
        },
      },
    });
  }
});
