import {
  BadRequestException,
  Controller,
  Get,
  INestApplication,
  Post,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { UniqueConstraintViolationError } from '../src/application/errors/unique-constraint-violation.error';
import { AuthenticationRequiredError } from '../src/identity/application/errors/authentication-required.error';
import { LoginRateLimitExceededError } from '../src/identity/application/errors/login-rate-limit-exceeded.error';
import { InvalidPasswordError } from '../src/identity/domain/invalid-password.error';
import { ProblemDetails } from '../src/infrastructure/http/problem-details/problem-details';
import { ProblemDetailsModule } from '../src/infrastructure/http/problem-details/problem-details.module';
import { TraceIdGenerator } from '../src/infrastructure/http/problem-details/trace-id-generator';

describe('Problem Details (e2e)', () => {
  const traceId = 'trace-opaque-001';
  let app: INestApplication<App>;

  beforeAll(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [ProblemDetailsModule],
      controllers: [ProblemTestController],
    })
      .overrideProvider(TraceIdGenerator)
      .useValue({ generate: () => traceId })
      .compile();

    app = testingModule.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a field-level validation problem', async () => {
    const response = await request(app.getHttpServer())
      .post('/_test/problems/validation')
      .expect(422)
      .expect('Content-Type', /application\/problem\+json/u)
      .expect('X-Trace-Id', traceId);

    expect(problemBody(response.body)).toEqual({
      type: 'https://marketplace.example/problems/validation-error',
      title: 'Não foi possível validar os dados.',
      status: 422,
      code: 'validation_error',
      instance: `/problems/${traceId}`,
      errors: [
        {
          field: 'password',
          code: 'password_too_short',
          message: 'Use pelo menos 15 caracteres.',
        },
      ],
    });
  });

  it.each([
    ['authentication', 401, 'authentication_required'],
    ['conflict', 409, 'state_conflict'],
    ['media', 415, 'unsupported_media_type'],
  ])(
    'maps %s failures to a stable public contract',
    async (path, status, code) => {
      const response = await request(app.getHttpServer())
        .post(`/_test/problems/${path}`)
        .expect(status)
        .expect('Content-Type', /application\/problem\+json/u);
      const body = problemBody(response.body);

      expect(body).toMatchObject({
        status,
        code,
        instance: `/problems/${traceId}`,
      });
      expect(body).not.toHaveProperty('detail');
      expect(body).not.toHaveProperty('stack');
    },
  );

  it('includes Retry-After for a temporary rate limit', async () => {
    const response = await request(app.getHttpServer())
      .post('/_test/problems/rate-limit')
      .expect(429)
      .expect('Retry-After', '75');

    expect(problemBody(response.body)).toMatchObject({
      status: 429,
      code: 'rate_limit_exceeded',
      instance: `/problems/${traceId}`,
    });
  });

  it('redacts framework exception messages instead of reflecting them', async () => {
    const response = await request(app.getHttpServer())
      .post('/_test/problems/unsafe-http')
      .expect(400);
    const serialized = JSON.stringify(problemBody(response.body));

    expect(serialized).toContain('invalid_request');
    expect(serialized).not.toContain('raw-token-value');
    expect(serialized).not.toContain('users_private_table');
  });

  it('captures an unexpected exception without exposing message or stack', async () => {
    const response = await request(app.getHttpServer())
      .post('/_test/problems/internal')
      .expect(500)
      .expect('Content-Type', /application\/problem\+json/u);
    const body = problemBody(response.body);
    const serialized = JSON.stringify(body);

    expect(body).toEqual({
      type: 'https://marketplace.example/problems/internal-error',
      title: 'Não foi possível concluir a solicitação.',
      status: 500,
      code: 'internal_error',
      instance: `/problems/${traceId}`,
    });
    expect(serialized).not.toContain('database-password');
    expect(serialized).not.toContain('raw-reset-token');
    expect(serialized).not.toContain('Error:');
  });

  it('also normalizes framework-generated 404 responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/_test/problems/does-not-exist')
      .expect(404);

    expect(problemBody(response.body)).toMatchObject({
      status: 404,
      code: 'resource_not_found',
      instance: `/problems/${traceId}`,
    });
  });
});

@Controller('_test/problems')
class ProblemTestController {
  @Post('validation')
  validation(): never {
    throw new InvalidPasswordError('TOO_SHORT');
  }

  @Post('authentication')
  authentication(): never {
    throw new AuthenticationRequiredError();
  }

  @Post('conflict')
  conflict(): never {
    throw new UniqueConstraintViolationError(['users_private_table']);
  }

  @Post('media')
  media(): never {
    throw new UnsupportedMediaTypeException('raw-token-value');
  }

  @Post('rate-limit')
  rateLimit(): never {
    throw new LoginRateLimitExceededError(75);
  }

  @Post('unsafe-http')
  unsafeHttp(): never {
    throw new BadRequestException('raw-token-value from users_private_table');
  }

  @Post('internal')
  internal(): never {
    throw new Error('database-password and raw-reset-token');
  }

  @Get('reachable')
  reachable(): { readonly status: 'ok' } {
    return { status: 'ok' };
  }
}

function problemBody(value: unknown): ProblemDetails {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected an object Problem Details response.');
  }

  return value as ProblemDetails;
}
