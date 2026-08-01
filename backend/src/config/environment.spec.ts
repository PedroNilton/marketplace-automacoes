import { EnvironmentValidationError, validateEnvironment } from './environment';

const validBaseEnvironment = {
  API_ORIGIN: 'http://127.0.0.1:3001',
  FRONTEND_ORIGIN: 'http://127.0.0.1:3000',
  DATABASE_URL:
    'postgresql://marketplace:marketplace_local@127.0.0.1:5433/marketplace_automacoes',
  SMTP_FROM: 'nao-responder@marketplace.local',
  AUTH_HMAC_SECRET: 'test-only-hmac-secret-with-at-least-32-characters',
};

describe('validateEnvironment', () => {
  it('parses base environment values into their runtime types', () => {
    const environment = validateEnvironment({
      ...validBaseEnvironment,
      NODE_ENV: 'test',
      PORT: '3101',
      SMTP_HOST: 'mailpit',
      SMTP_PORT: '2025',
      SMTP_SECURE: 'true',
    });

    expect(environment).toMatchObject({
      NODE_ENV: 'test',
      PORT: 3101,
      SMTP_HOST: 'mailpit',
      SMTP_PORT: 2025,
      SMTP_SECURE: true,
    });
  });

  it('provides safe local defaults for optional base values', () => {
    const environment = validateEnvironment(validBaseEnvironment);

    expect(environment).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3001,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: 1025,
      SMTP_SECURE: false,
      SESSION_COOKIE_NAME: 'marketplace_session',
      SESSION_COOKIE_SECURE: false,
      SESSION_COOKIE_SAME_SITE: 'lax',
      SESSION_ABSOLUTE_TTL: 604800,
      SESSION_IDLE_TTL: 86400,
      SESSION_ACTIVITY_TOUCH_INTERVAL: 900,
      EMAIL_VERIFICATION_TTL: 86400,
      PASSWORD_RESET_TTL: 1800,
      ARGON2_MEMORY_KIB: 19456,
      ARGON2_ITERATIONS: 2,
      ARGON2_PARALLELISM: 1,
    });
  });

  it('rejects invalid ports and non-PostgreSQL database URLs', () => {
    expect(() =>
      validateEnvironment({
        ...validBaseEnvironment,
        PORT: '70000',
        DATABASE_URL: 'mysql://localhost/marketplace',
      }),
    ).toThrow(EnvironmentValidationError);

    expect(() =>
      validateEnvironment({
        ...validBaseEnvironment,
        PORT: '70000',
        DATABASE_URL: 'mysql://localhost/marketplace',
      }),
    ).toThrow(/PORT:|DATABASE_URL:/);
  });

  it('rejects a missing or weak HMAC secret without exposing its value', () => {
    try {
      validateEnvironment({
        ...validBaseEnvironment,
        AUTH_HMAC_SECRET: 'weak-secret',
      });
      throw new Error('Expected environment validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect((error as Error).message).toContain('AUTH_HMAC_SECRET');
      expect((error as Error).message).not.toContain('weak-secret');
    }
  });

  it('rejects an absent HMAC secret', () => {
    const environmentWithoutSecret = { ...validBaseEnvironment };
    delete (environmentWithoutSecret as Partial<typeof validBaseEnvironment>)
      .AUTH_HMAC_SECRET;

    expect(() => validateEnvironment(environmentWithoutSecret)).toThrow(
      /AUTH_HMAC_SECRET:/,
    );
  });

  it('rejects inconsistent session durations', () => {
    expect(() =>
      validateEnvironment({
        ...validBaseEnvironment,
        SESSION_ABSOLUTE_TTL: '3600',
        SESSION_IDLE_TTL: '7200',
        SESSION_ACTIVITY_TOUCH_INTERVAL: '8000',
      }),
    ).toThrow(/SESSION_IDLE_TTL:|SESSION_ACTIVITY_TOUCH_INTERVAL:/);
  });

  it('requires secure HTTPS cookie settings in production', () => {
    expect(() =>
      validateEnvironment({
        ...validBaseEnvironment,
        NODE_ENV: 'production',
      }),
    ).toThrow(
      /SESSION_COOKIE_SECURE:|SESSION_COOKIE_NAME:|API_ORIGIN:|FRONTEND_ORIGIN:/,
    );
  });
});
