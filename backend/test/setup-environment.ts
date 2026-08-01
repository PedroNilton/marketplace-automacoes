Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '3001',
  API_ORIGIN: 'http://127.0.0.1:3001',
  FRONTEND_ORIGIN: 'http://127.0.0.1:3000',
  DATABASE_URL:
    'postgresql://marketplace:marketplace_local@127.0.0.1:5433/marketplace_automacoes',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  SMTP_SECURE: 'false',
  SMTP_FROM: 'nao-responder@marketplace.local',
  AUTH_HMAC_SECRET: 'test-only-hmac-secret-with-at-least-32-characters',
});
