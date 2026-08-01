import { EnvironmentValidationError, validateEnvironment } from './environment';

const validBaseEnvironment = {
  API_ORIGIN: 'http://127.0.0.1:3001',
  FRONTEND_ORIGIN: 'http://127.0.0.1:3000',
  DATABASE_URL:
    'postgresql://marketplace:marketplace_local@127.0.0.1:5433/marketplace_automacoes',
  SMTP_FROM: 'nao-responder@marketplace.local',
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
});
