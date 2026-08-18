import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { ProblemDetails } from '../../../infrastructure/http/problem-details/problem-details';
import { ProblemDetailsModule } from '../../../infrastructure/http/problem-details/problem-details.module';
import { ConfirmEmailVerification } from '../../application/confirm-email-verification';
import { ConfirmPasswordReset } from '../../application/confirm-password-reset';
import { GetCurrentIdentity } from '../../application/get-current-identity';
import { LoginUser } from '../../application/login-user';
import { LogoutSession } from '../../application/logout-session';
import { RegisterUser } from '../../application/register-user';
import { RequestPasswordReset } from '../../application/request-password-reset';
import { ResendEmailVerification } from '../../application/resend-email-verification';
import { IdentityController } from './identity.controller';
import { SessionCookie } from './session-cookie';

const user = {
  id: '018f99f6-c71c-7f03-a4f5-f03d3427f196',
  displayName: 'Ana Souza',
  emailVerified: true,
  platformRole: 'MEMBER' as const,
};
const currentIdentity = {
  user,
  session: { restricted: false, csrfToken: 'csrf-public-token' },
};

describe('IdentityController HTTP contracts', () => {
  let app: INestApplication<App>;
  let document: OpenAPIObject;

  const registerUser = { execute: jest.fn() };
  const confirmEmailVerification = { execute: jest.fn() };
  const resendEmailVerification = { execute: jest.fn() };
  const loginUser = { execute: jest.fn() };
  const getCurrentIdentity = { execute: jest.fn() };
  const logoutSession = { execute: jest.fn() };
  const requestPasswordReset = { execute: jest.fn() };
  const confirmPasswordReset = { execute: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ProblemDetailsModule],
      controllers: [IdentityController],
      providers: [
        SessionCookie,
        { provide: RegisterUser, useValue: registerUser },
        {
          provide: ConfirmEmailVerification,
          useValue: confirmEmailVerification,
        },
        { provide: ResendEmailVerification, useValue: resendEmailVerification },
        { provide: LoginUser, useValue: loginUser },
        { provide: GetCurrentIdentity, useValue: getCurrentIdentity },
        { provide: LogoutSession, useValue: logoutSession },
        { provide: RequestPasswordReset, useValue: requestPasswordReset },
        { provide: ConfirmPasswordReset, useValue: confirmPasswordReset },
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

    app = module.createNestApplication();
    await app.init();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Marketplace de Automações').build(),
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    registerUser.execute.mockResolvedValue({
      accepted: true,
      verification: null,
    });
    confirmEmailVerification.execute.mockResolvedValue({ status: 'VERIFIED' });
    resendEmailVerification.execute.mockResolvedValue({
      accepted: true,
      verification: null,
    });
    loginUser.execute.mockResolvedValue({
      user,
      session: {
        token: 'raw-session-token-must-not-leak',
        csrfToken: 'csrf-public-token',
        restricted: false,
        returnTo: '/painel',
        idleExpiresAt: new Date('2026-08-18T12:00:00.000Z'),
        absoluteExpiresAt: new Date('2026-08-25T12:00:00.000Z'),
      },
    });
    getCurrentIdentity.execute.mockResolvedValue(currentIdentity);
    logoutSession.execute.mockResolvedValue({ accepted: true, revoked: true });
    requestPasswordReset.execute.mockResolvedValue({
      accepted: true,
      reset: null,
    });
    confirmPasswordReset.execute.mockResolvedValue({
      status: 'RESET',
      notification: { recipient: 'ana@example.com', displayName: 'Ana Souza' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts registration without exposing delivery or account existence', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/registrations')
      .send({
        displayName: 'Ana Souza',
        email: 'ana@example.com',
        password: 'uma-senha-segura-com-15',
        passwordConfirmation: 'uma-senha-segura-com-15',
        termsVersion: 'beta-1',
        privacyVersion: 'beta-1',
      })
      .expect(202)
      .expect('Content-Type', /json/);

    expect(response.body as unknown).toEqual({
      message:
        'Se o cadastro puder ser concluído, enviaremos as instruções para o e-mail informado.',
    });
    expect(registerUser.execute).toHaveBeenCalledTimes(1);
  });

  it('confirms an email with an empty 204 response', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/email-verifications/confirmations')
      .send({ token: 'verification-token' })
      .expect(204);

    expect(response.text).toBe('');
    expect(response.headers['content-type']).toBeUndefined();
  });

  it('accepts an email verification resend neutrally', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/email-verifications/requests')
      .send({ email: 'ana@example.com' })
      .expect(202)
      .expect('Content-Type', /json/);

    expect(response.body as unknown).toEqual({
      message:
        'Se a solicitação puder ser concluída, enviaremos as instruções para o e-mail informado.',
    });
  });

  it('returns the public login contract without leaking the raw session token', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/sessions')
      .send({
        email: 'ana@example.com',
        password: 'uma-senha-segura-com-15',
        returnTo: '/painel',
      })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['set-cookie']).toEqual([
      expect.stringContaining(
        'marketplace_session=raw-session-token-must-not-leak',
      ),
    ]);
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure');
    expect(cookie).not.toContain('Domain=');

    expect(response.body as unknown).toEqual({
      user,
      session: {
        restricted: false,
        csrfToken: 'csrf-public-token',
        returnTo: '/painel',
      },
    });
    expect(JSON.stringify(response.body as unknown)).not.toContain(
      'raw-session-token',
    );
  });

  it('returns the current identity from the configured session cookie', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/auth/session')
      .set('Cookie', 'marketplace_session=session-token')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect('Cache-Control', 'no-store');

    expect(response.body as unknown).toEqual(currentIdentity);
    expect(getCurrentIdentity.execute).toHaveBeenCalledWith({
      sessionToken: 'session-token',
    });
  });

  it('ends a session idempotently with an empty 204 response', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/auth/session')
      .set('Cookie', 'marketplace_session=session-token')
      .expect(204);

    expect(response.text).toBe('');
    expect(response.headers['content-type']).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['set-cookie']?.[0]).toContain(
      'marketplace_session=;',
    );
    expect(response.headers['set-cookie']?.[0]).toContain(
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    );
  });

  it('accepts a password reset request neutrally', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/password-resets/requests')
      .send({ email: 'ana@example.com' })
      .expect(202)
      .expect('Content-Type', /json/);

    expect(response.body as unknown).toEqual({
      message:
        'Se a recuperação puder ser iniciada, enviaremos as instruções para o e-mail informado.',
    });
  });

  it('confirms a password reset with an empty 204 response', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/password-resets/confirmations')
      .send({
        token: 'reset-token',
        password: 'uma-nova-senha-segura',
        passwordConfirmation: 'uma-nova-senha-segura',
      })
      .expect(204);

    expect(response.text).toBe('');
    expect(response.headers['content-type']).toBeUndefined();
  });

  it('returns safe problem details for structurally invalid input', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/sessions')
      .send({ email: 123, password: 'secret', unexpected: true })
      .expect(422)
      .expect('Content-Type', /application\/problem\+json/);

    const body = problemBody(response.body);
    expect(body).toMatchObject({
      status: 422,
      code: 'validation_error',
    });
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email', code: 'invalid_value' }),
      ]),
    );
  });

  it('publishes all eight operations in the generated OpenAPI document', () => {
    const operations = [
      ['/v1/auth/registrations', 'post'],
      ['/v1/auth/email-verifications/confirmations', 'post'],
      ['/v1/auth/email-verifications/requests', 'post'],
      ['/v1/auth/sessions', 'post'],
      ['/v1/auth/session', 'get'],
      ['/v1/auth/session', 'delete'],
      ['/v1/auth/password-resets/requests', 'post'],
      ['/v1/auth/password-resets/confirmations', 'post'],
    ] as const;

    for (const [path, method] of operations) {
      expect(document.paths[path]?.[method]).toBeDefined();
    }
    expect(document.paths['/v1/auth/sessions']?.post?.responses).toHaveProperty(
      '200',
    );
    expect(document.components?.schemas).toHaveProperty('LoginResponseDto');
  });
});

function problemBody(value: unknown): ProblemDetails {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected an object Problem Details response.');
  }

  return value as ProblemDetails;
}
