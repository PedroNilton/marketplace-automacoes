import { ConfigService } from '@nestjs/config';
import { Environment } from '../../../config/environment';
import { HmacCsrfTokenDeriver } from './hmac-csrf-token-deriver';

describe('HmacCsrfTokenDeriver', () => {
  const secret = 'test-secret-with-at-least-32-characters';
  const config = {
    get: jest.fn().mockReturnValue(secret),
  } as unknown as ConfigService<Environment, true>;
  const deriver = new HmacCsrfTokenDeriver(config);

  it('derives a stable opaque token for the same session token', () => {
    const first = deriver.derive('raw-session-token');
    const second = deriver.derive('raw-session-token');

    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Za-z\d_-]{43}$/);
    expect(first).not.toContain('raw-session-token');
  });

  it('separates different session tokens', () => {
    expect(deriver.derive('session-a')).not.toBe(deriver.derive('session-b'));
  });

  it('depends on the configured secret', () => {
    const otherConfig = {
      get: jest.fn().mockReturnValue('another-secret-with-at-least-32-chars'),
    } as unknown as ConfigService<Environment, true>;

    expect(new HmacCsrfTokenDeriver(otherConfig).derive('session-a')).not.toBe(
      deriver.derive('session-a'),
    );
  });
});
