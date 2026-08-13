import { ConfigService } from '@nestjs/config';
import { Environment } from '../../../config/environment';
import { HmacRateLimitKeyDigester } from './hmac-rate-limit-key-digester';

describe('HmacRateLimitKeyDigester', () => {
  const secret = 'test-only-hmac-secret-with-at-least-32-characters';
  const config = {
    get: jest.fn(() => secret),
  } as unknown as ConfigService<Environment, true>;
  const digester = new HmacRateLimitKeyDigester(config);

  it('creates a deterministic hexadecimal HMAC without exposing the identifier', () => {
    const identifier = 'pessoa@example.com';
    const digest = digester.digest('LOGIN', 'ACCOUNT', identifier);

    expect(digest).toMatch(/^[a-f\d]{64}$/);
    expect(digester.digest('LOGIN', 'ACCOUNT', identifier)).toBe(digest);
    expect(digest).not.toContain(identifier);
    expect(digest).not.toContain(secret);
  });

  it('separates action, scope and identifier namespaces', () => {
    const identifier = 'pessoa@example.com';
    const values = [
      digester.digest('LOGIN', 'ACCOUNT', identifier),
      digester.digest('PASSWORD_RESET', 'ACCOUNT', identifier),
      digester.digest('LOGIN', 'ORIGIN', identifier),
      digester.digest('LOGIN', 'ACCOUNT', 'outra@example.com'),
    ];

    expect(new Set(values).size).toBe(values.length);
  });

  it('does not log the identifier, secret or digest', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    try {
      digester.digest('REGISTRATION', 'ORIGIN', '203.0.113.10');
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
