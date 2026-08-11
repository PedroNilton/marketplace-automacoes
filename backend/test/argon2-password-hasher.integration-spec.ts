import { Argon2idPasswordHasher } from '../src/identity/infrastructure/password/argon2id-password-hasher';

describe('Argon2idPasswordHasher integration', () => {
  const hasher = new Argon2idPasswordHasher({
    memoryCostKiB: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  it('creates a salted Argon2id hash with the configured baseline', async () => {
    const password = 'frase secreta longa 🔐';

    const firstHash = await hasher.hash(password);
    const secondHash = await hasher.hash(password);

    expect(firstHash).toMatch(
      /^\$argon2id\$v=19\$m=19456,p=1,t=2\$[^$]+\$[^$]+$/,
    );
    expect(firstHash).not.toContain(password);
    expect(secondHash).not.toBe(firstHash);
    await expect(hasher.verify(firstHash, password)).resolves.toBe(true);
    await expect(hasher.verify(firstHash, 'outra frase secreta')).resolves.toBe(
      false,
    );
  });

  it('fails closed when the stored hash is malformed', async () => {
    await expect(
      hasher.verify('not-an-argon2-hash', 'frase secreta longa 🔐'),
    ).resolves.toBe(false);
  });

  it('rejects parameters below the approved security baseline', () => {
    expect(
      () =>
        new Argon2idPasswordHasher({
          memoryCostKiB: 19_455,
          timeCost: 2,
          parallelism: 1,
        }),
    ).toThrow('Argon2id parameters do not meet the security baseline.');
  });
});
