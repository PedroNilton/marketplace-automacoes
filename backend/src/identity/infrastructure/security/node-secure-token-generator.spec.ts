import { NodeSecureTokenGenerator } from './node-secure-token-generator';

describe('NodeSecureTokenGenerator', () => {
  const generator = new NodeSecureTokenGenerator();

  it('generates a URL-safe token with 256 bits of entropy', () => {
    const token = generator.generate();

    expect(NodeSecureTokenGenerator.entropyBits).toBe(256);
    expect(token).toMatch(/^[A-Za-z\d_-]{43}$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
  });

  it('does not reuse generated values', () => {
    const tokens = Array.from({ length: 64 }, () => generator.generate());

    expect(new Set(tokens).size).toBe(tokens.length);
  });
});
