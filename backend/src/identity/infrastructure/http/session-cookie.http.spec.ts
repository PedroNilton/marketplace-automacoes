import {
  Controller,
  Delete,
  HttpCode,
  INestApplication,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { SessionCookie } from './session-cookie';

const ABSOLUTE_EXPIRATION = new Date('2026-08-25T12:00:00.000Z');

describe('SessionCookie HTTP attributes', () => {
  it.each([
    {
      environment: 'local',
      name: 'marketplace_session',
      secure: false,
    },
    {
      environment: 'production',
      name: '__Host-marketplace_session',
      secure: true,
    },
  ])(
    'issues and removes the cookie safely in $environment',
    async ({ name, secure }) => {
      const app = await createCookieTestApplication({ name, secure });

      try {
        const issued = await request(app.getHttpServer())
          .post('/_test/session-cookie')
          .expect(204);
        const issuedCookie = singleSetCookie(issued.headers['set-cookie']);

        expect(issuedCookie).toContain(`${name}=opaque-session-token`);
        expect(issuedCookie).toContain('Path=/');
        expect(issuedCookie).toContain('Expires=Tue, 25 Aug 2026 12:00:00 GMT');
        expect(issuedCookie).toContain('HttpOnly');
        expect(issuedCookie).toContain('SameSite=Lax');
        expect(issuedCookie.includes('Secure')).toBe(secure);
        expect(issuedCookie).not.toContain('Domain=');

        const removed = await request(app.getHttpServer())
          .delete('/_test/session-cookie')
          .expect(204);
        const removedCookie = singleSetCookie(removed.headers['set-cookie']);

        expect(removedCookie).toContain(`${name}=;`);
        expect(removedCookie).toContain('Path=/');
        expect(removedCookie).toContain(
          'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        );
        expect(removedCookie).toContain('HttpOnly');
        expect(removedCookie).toContain('SameSite=Lax');
        expect(removedCookie.includes('Secure')).toBe(secure);
        expect(removedCookie).not.toContain('Domain=');
      } finally {
        await app.close();
      }
    },
  );
});

@Controller('_test/session-cookie')
class SessionCookieTestController {
  constructor(private readonly cookie: SessionCookie) {}

  @Post()
  @HttpCode(204)
  issue(@Res({ passthrough: true }) response: Response): void {
    this.cookie.issue(response, 'opaque-session-token', ABSOLUTE_EXPIRATION);
  }

  @Delete()
  @HttpCode(204)
  remove(@Res({ passthrough: true }) response: Response): void {
    this.cookie.remove(response);
  }
}

async function createCookieTestApplication(options: {
  readonly name: string;
  readonly secure: boolean;
}): Promise<INestApplication<App>> {
  const values: Record<string, string | boolean> = {
    SESSION_COOKIE_NAME: options.name,
    SESSION_COOKIE_SECURE: options.secure,
    SESSION_COOKIE_SAME_SITE: 'lax',
  };
  const testingModule: TestingModule = await Test.createTestingModule({
    controllers: [SessionCookieTestController],
    providers: [
      SessionCookie,
      {
        provide: ConfigService,
        useValue: { get: (key: string) => values[key] },
      },
    ],
  }).compile();
  const app: INestApplication<App> = testingModule.createNestApplication();

  await app.init();
  return app;
}

function singleSetCookie(value: string[] | undefined): string {
  if (value?.length !== 1) {
    throw new Error('Expected exactly one Set-Cookie header.');
  }

  return value[0];
}
