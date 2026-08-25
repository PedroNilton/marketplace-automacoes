import {
  readPasswordResetToken,
  safePasswordResetPathname,
} from './password-reset-token';

describe('password reset token helpers', () => {
  it('reads a nonempty token from a recovery link', () => {
    expect(readPasswordResetToken('?token=raw-token-with-%3F%26')).toBe(
      'raw-token-with-?&',
    );
  });

  it('rejects an absent, blank, or oversized token', () => {
    expect(readPasswordResetToken('')).toBeNull();
    expect(readPasswordResetToken('?token=%20')).toBeNull();
    expect(readPasswordResetToken(`?token=${'a'.repeat(513)}`)).toBeNull();
  });

  it('keeps only the reset route when removing the token from the URL', () => {
    expect(safePasswordResetPathname('/redefinir-senha')).toBe(
      '/redefinir-senha',
    );
    expect(safePasswordResetPathname('/outro-caminho')).toBe(
      '/redefinir-senha',
    );
  });
});
