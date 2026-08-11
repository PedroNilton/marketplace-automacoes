import { Sha256TokenDigester } from './sha256-token-digester';

describe('Sha256TokenDigester', () => {
  const digester = new Sha256TokenDigester();
  const token = 'R8sOKvBf5Yv9-hYz72x9ewYsrYubDzkHwg7mMXWDeT0';

  it('creates a deterministic SHA-256 hexadecimal digest', () => {
    const digest = digester.digest(token);

    expect(digest).toMatch(/^[a-f\d]{64}$/);
    expect(digester.digest(token)).toBe(digest);
    expect(digest).not.toContain(token);
  });

  it('matches the token without comparing raw values', () => {
    const digest = digester.digest(token);

    expect(digester.matches(token, digest)).toBe(true);
    expect(digester.matches(token, digest.toUpperCase())).toBe(true);
    expect(digester.matches(`${token}changed`, digest)).toBe(false);
  });

  it.each(['', 'not-a-digest', 'a'.repeat(63), 'g'.repeat(64)])(
    'fails closed for malformed digest %p',
    (digest) => {
      expect(digester.matches(token, digest)).toBe(false);
    },
  );

  it('does not write the raw token or digest to the console', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    try {
      const digest = digester.digest(token);
      digester.matches(token, digest);

      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
