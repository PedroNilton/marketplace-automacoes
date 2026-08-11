import { InvalidPasswordError } from './invalid-password.error';
import { PasswordPolicy } from './password-policy';
import { LocalPasswordBlocklist } from '../infrastructure/password/local-password-blocklist';

describe('PasswordPolicy', () => {
  const policy = new PasswordPolicy(new LocalPasswordBlocklist());

  it('accepts the exact lower and upper length boundaries', () => {
    const minimumPassword = 'abcdefghijklmno';
    const maximumPassword = '🔐'.repeat(128);

    expect(() =>
      policy.validate(minimumPassword, minimumPassword),
    ).not.toThrow();
    expect(() =>
      policy.validate(maximumPassword, maximumPassword),
    ).not.toThrow();
  });

  it('accepts spaces, Unicode and passwords without composition rules', () => {
    const password = 'uma frase longa café 🔐';
    const onlyLetters = 'somenteletraslongas';

    expect(() => policy.validate(password, password)).not.toThrow();
    expect(() => policy.validate(onlyLetters, onlyLetters)).not.toThrow();
  });

  it.each([
    ['TOO_SHORT', 'abcdefghijklmn'],
    ['TOO_LONG', 'a'.repeat(129)],
  ] as const)('rejects passwords with reason %s', (reason, password) => {
    expectInvalidPasswordReason(
      () => policy.validate(password, password),
      reason,
    );
  });

  it('requires an exact confirmation without transforming the password', () => {
    const password = ' Senha válida 123 ';

    expectInvalidPasswordReason(
      () => policy.validate(password, password.trim()),
      'CONFIRMATION_MISMATCH',
    );
  });

  it('rejects a locally blocked password without exposing the entry', () => {
    const blockedPassword = ' PasswordPassword ';

    try {
      policy.validate(blockedPassword, blockedPassword);
      throw new Error('Expected password validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidPasswordError);
      expect(error).toMatchObject({ reason: 'BLOCKED' });
      expect((error as Error).message).not.toContain(blockedPassword);
      expect((error as Error).message).not.toContain('passwordpassword');
    }
  });

  it('sends the complete unchanged password only to the local blocklist', () => {
    const password = `${'a'.repeat(126)} 🔐`;
    const blocklist = { contains: jest.fn(() => false) };
    const localPolicy = new PasswordPolicy(blocklist);

    localPolicy.validate(password, password);

    expect(blocklist.contains).toHaveBeenCalledWith(password);
  });
});

function expectInvalidPasswordReason(
  action: () => void,
  reason: InvalidPasswordError['reason'],
): void {
  try {
    action();
    throw new Error('Expected password validation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidPasswordError);
    expect(error).toMatchObject({ reason });
  }
}
