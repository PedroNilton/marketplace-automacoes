import {
  Controller,
  Delete,
  Get,
  INestApplication,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ProblemDetailsModule } from '../problem-details/problem-details.module';
import { AuthenticationRequiredError } from '../../../identity/application/errors/authentication-required.error';
import {
  GetCurrentIdentity,
  GetCurrentIdentityInput,
  GetCurrentIdentityResult,
} from '../../../identity/application/get-current-identity';
import { SessionCookie } from '../../../identity/infrastructure/http/session-cookie';
import { BrowserProtectionGuard } from './browser-protection.guard';

const FRONTEND_ORIGIN = 'http://127.0.0.1:3000';

describe('BrowserProtectionGuard origin and media policies', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [ProblemDetailsModule],
      controllers: [BrowserProtectionTestController],
      providers: [
        SessionCookie,
        { provide: GetCurrentIdentity, useClass: StubCurrentIdentity },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({
                FRONTEND_ORIGIN,
                SESSION_COOKIE_NAME: 'marketplace_session',
                SESSION_COOKIE_SECURE: false,
                SESSION_COOKIE_SAME_SITE: 'lax',
              })[key],
          },
        },
        {
          provide: APP_GUARD,
          useClass: BrowserProtectionGuard,
        },
      ],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps safe reads available without an Origin header', async () => {
    await request(app.getHttpServer())
      .get('/_test/browser-protection')
      .expect(200);
  });

  it.each([undefined, 'https://attacker.example'])(
    'rejects an unsafe request from origin %s',
    async (origin) => {
      const pending = request(app.getHttpServer())
        .post('/_test/browser-protection')
        .set('Content-Type', 'application/json');
      if (origin) {
        pending.set('Origin', origin);
      }
      const response = await pending.send({ accepted: true }).expect(403);

      expect(response.body as unknown).toMatchObject({
        status: 403,
        code: 'origin_validation_failed',
      });
    },
  );

  it.each([undefined, 'text/plain'])(
    'rejects POST content type %s even from the configured origin',
    async (contentType) => {
      const pending = request(app.getHttpServer())
        .post('/_test/browser-protection')
        .set('Origin', FRONTEND_ORIGIN);
      if (contentType) {
        pending.set('Content-Type', contentType).send('payload');
      }
      const response = await pending.expect(415);

      expect(response.body as unknown).toMatchObject({
        status: 415,
        code: 'unsupported_media_type',
      });
    },
  );

  it('accepts JSON with charset from the configured origin', async () => {
    await request(app.getHttpServer())
      .post('/_test/browser-protection')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Content-Type', 'application/json; charset=utf-8')
      .send({ accepted: true })
      .expect(201);
  });

  it('does not require a content type for a bodyless DELETE', async () => {
    await request(app.getHttpServer())
      .delete('/_test/browser-protection')
      .set('Origin', FRONTEND_ORIGIN)
      .expect(200);
  });

  it.each([undefined, 'wrong-csrf'])(
    'rejects CSRF token %s for a mutation with a valid session',
    async (csrfToken) => {
      const pending = request(app.getHttpServer())
        .post('/_test/browser-protection')
        .set('Origin', FRONTEND_ORIGIN)
        .set('Cookie', 'marketplace_session=valid-session')
        .set('Content-Type', 'application/json');
      if (csrfToken) {
        pending.set('X-CSRF-Token', csrfToken);
      }
      const response = await pending.send({ accepted: true }).expect(403);

      expect(response.body as unknown).toMatchObject({
        status: 403,
        code: 'csrf_validation_failed',
      });
    },
  );

  it('accepts the matching CSRF token for an authenticated mutation', async () => {
    await request(app.getHttpServer())
      .post('/_test/browser-protection')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Cookie', 'marketplace_session=valid-session')
      .set('X-CSRF-Token', 'expected-csrf-token')
      .send({ accepted: true })
      .expect(201);
  });

  it('keeps a public mutation available when a stale cookie does not resolve', async () => {
    await request(app.getHttpServer())
      .post('/_test/browser-protection')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Cookie', 'marketplace_session=stale-session')
      .send({ accepted: true })
      .expect(201);
  });

  it('requires CSRF for a bodyless DELETE when the session is valid', async () => {
    await request(app.getHttpServer())
      .delete('/_test/browser-protection')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Cookie', 'marketplace_session=valid-session')
      .expect(403);

    await request(app.getHttpServer())
      .delete('/_test/browser-protection')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Cookie', 'marketplace_session=valid-session')
      .set('X-CSRF-Token', 'expected-csrf-token')
      .expect(200);
  });
});

@Controller('_test/browser-protection')
class BrowserProtectionTestController {
  @Get()
  get(): { readonly accepted: true } {
    return { accepted: true };
  }

  @Post()
  post(): { readonly accepted: true } {
    return { accepted: true };
  }

  @Delete()
  delete(): { readonly accepted: true } {
    return { accepted: true };
  }
}

class StubCurrentIdentity {
  execute(input: GetCurrentIdentityInput): Promise<GetCurrentIdentityResult> {
    if (input.sessionToken !== 'valid-session') {
      throw new AuthenticationRequiredError();
    }

    return Promise.resolve({
      user: {
        id: 'user-1',
        displayName: 'Ana Souza',
        emailVerified: true,
        platformRole: 'MEMBER',
      },
      session: {
        restricted: false,
        csrfToken: 'expected-csrf-token',
      },
    });
  }
}
