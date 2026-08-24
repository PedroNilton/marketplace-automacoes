import {
  readEmailVerificationToken,
  safeVerificationPathname,
} from './email-verification-token';

describe('email verification token helpers', () => {
  it('reads a nonempty token from an email link', () => {
    expect(
      readEmailVerificationToken('?token=raw-token-with-%3F%26-characters'),
    ).toBe('raw-token-with-?&-characters');
  });

  it('does not retain an absent, blank, or oversized token', () => {
    expect(readEmailVerificationToken('')).toBeNull();
    expect(readEmailVerificationToken('?token=%20')).toBeNull();
    expect(readEmailVerificationToken(`?token=${'a'.repeat(513)}`)).toBeNull();
  });

  it('only keeps the verification route when removing the query string', () => {
    expect(safeVerificationPathname('/verificar-email')).toBe(
      '/verificar-email',
    );
    expect(safeVerificationPathname('/not-found')).toBe('/verificar-email');
  });
});
