import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ProblemDetailsModule } from '../../../infrastructure/http/problem-details/problem-details.module';
import { AuthenticationRequiredError } from '../../application/errors/authentication-required.error';
import {
  GetCurrentIdentity,
  GetCurrentIdentityInput,
  GetCurrentIdentityResult,
} from '../../application/get-current-identity';
import { CurrentIdentity } from './current-identity.decorator';
import {
  AllowRestrictedSession,
  RequirePlatformRole,
  RequireSession,
} from './identity-access.decorator';
import { IdentityAccessGuard } from './identity-access.guard';
import { RequestIdentity } from './request-identity';
import { SessionCookie } from './session-cookie';

describe('IdentityAccessGuard HTTP policies', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [ProblemDetailsModule],
      controllers: [ProtectedTestController],
      providers: [
        IdentityAccessGuard,
        SessionCookie,
        { provide: GetCurrentIdentity, useClass: StubCurrentIdentity },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({
                SESSION_COOKIE_NAME: 'marketplace_session',
                SESSION_COOKIE_SECURE: false,
                SESSION_COOKIE_SAME_SITE: 'lax',
              })[key],
          },
        },
      ],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('denies an absent session with the stable authentication problem', async () => {
    const response = await request(app.getHttpServer())
      .get('/_test/access/verified')
      .expect(401)
      .expect('Content-Type', /application\/problem\+json/u);

    expect(response.body as unknown).toMatchObject({
      status: 401,
      code: 'authentication_required',
    });
  });

  it('denies a restricted session on a verified route', async () => {
    const response = await request(app.getHttpServer())
      .get('/_test/access/verified')
      .set('Cookie', 'marketplace_session=restricted')
      .expect(403)
      .expect('Content-Type', /application\/problem\+json/u);

    expect(response.body as unknown).toMatchObject({
      status: 403,
      code: 'email_verification_required',
    });
  });

  it('allows a restricted session only on an explicit restricted route', async () => {
    const response = await request(app.getHttpServer())
      .get('/_test/access/restricted')
      .set('Cookie', 'marketplace_session=restricted')
      .expect(200)
      .expect('Content-Type', /json/u);

    expect(response.body as unknown).toMatchObject({
      user: { id: 'restricted-user', emailVerified: false },
      session: { restricted: true },
    });
  });

  it('denies a suspended account because its session no longer resolves', async () => {
    const response = await request(app.getHttpServer())
      .get('/_test/access/restricted')
      .set('Cookie', 'marketplace_session=suspended')
      .expect(401);

    expect(response.body as unknown).toMatchObject({
      code: 'authentication_required',
    });
  });

  it('denies a verified member with insufficient platform role', async () => {
    const response = await request(app.getHttpServer())
      .get('/_test/access/admin')
      .set('Cookie', 'marketplace_session=member')
      .expect(403);

    expect(response.body as unknown).toMatchObject({
      status: 403,
      code: 'access_denied',
    });
  });

  it('allows an administrator and exposes only the minimal identity', async () => {
    const response = await request(app.getHttpServer())
      .get('/_test/access/admin')
      .set('Cookie', 'marketplace_session=admin')
      .expect(200);
    const serialized = JSON.stringify(response.body as unknown);

    expect(response.body as unknown).toMatchObject({
      user: { id: 'admin-user', platformRole: 'ADMIN' },
      session: { restricted: false, csrfToken: 'admin-csrf' },
    });
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('tokenDigest');
    expect(serialized).not.toContain('sessionId');
  });
});

@Controller('_test/access')
class ProtectedTestController {
  @Get('verified')
  @RequireSession()
  verified(@CurrentIdentity() identity: RequestIdentity): RequestIdentity {
    return identity;
  }

  @Get('restricted')
  @AllowRestrictedSession()
  restricted(@CurrentIdentity() identity: RequestIdentity): RequestIdentity {
    return identity;
  }

  @Get('admin')
  @RequirePlatformRole('ADMIN')
  admin(@CurrentIdentity() identity: RequestIdentity): RequestIdentity {
    return identity;
  }
}

class StubCurrentIdentity {
  execute(input: GetCurrentIdentityInput): Promise<GetCurrentIdentityResult> {
    switch (input.sessionToken) {
      case 'restricted':
        return Promise.resolve(
          identity('restricted-user', false, 'MEMBER', 'restricted-csrf'),
        );
      case 'member':
        return Promise.resolve(
          identity('member-user', true, 'MEMBER', 'member-csrf'),
        );
      case 'admin':
        return Promise.resolve(
          identity('admin-user', true, 'ADMIN', 'admin-csrf'),
        );
      case 'suspended':
      default:
        throw new AuthenticationRequiredError();
    }
  }
}

function identity(
  id: string,
  emailVerified: boolean,
  platformRole: 'MEMBER' | 'ADMIN',
  csrfToken: string,
): GetCurrentIdentityResult {
  return {
    user: {
      id,
      displayName: 'Usuário de teste',
      emailVerified,
      platformRole,
    },
    session: { restricted: !emailVerified, csrfToken },
  };
}
