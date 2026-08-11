import { EmailAddress } from './email-address';
import { InvalidEmailError, InvalidEmailReason } from './invalid-email.error';

function expectInvalidEmail(input: string, reason: InvalidEmailReason): void {
  try {
    EmailAddress.create(input);
    throw new Error('Expected email creation to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidEmailError);
    expect(error).toHaveProperty('code', 'INVALID_EMAIL');
    expect(error).toHaveProperty('reason', reason);
  }
}

describe('EmailAddress', () => {
  it('trims surrounding whitespace and normalizes case once', () => {
    const email = EmailAddress.create('  MARIA.SILVA+OFERTAS@Example.COM  ');

    expect(email.value).toBe('maria.silva+ofertas@example.com');
    expect(email.toString()).toBe(email.value);
  });

  it('supports Unicode letters in a valid address', () => {
    const email = EmailAddress.create('JOSÉ@EXEMPLO.COM.BR');

    expect(email.value).toBe('josé@exemplo.com.br');
  });

  it('compares addresses by normalized value', () => {
    const first = EmailAddress.create(' Pessoa@Example.com ');
    const same = EmailAddress.create('pessoa@example.COM');
    const different = EmailAddress.create('outra@example.com');

    expect(first.equals(same)).toBe(true);
    expect(first.equals(different)).toBe(false);
  });

  it('accepts the planned maximum of 320 normalized characters', () => {
    const localPart = 'a'.repeat(64);
    const domain = [63, 63, 63, 61, 1]
      .map((length) => 'b'.repeat(length))
      .join('.');
    const input = `${localPart}@${domain}`;

    expect(input).toHaveLength(EmailAddress.maxLength);
    expect(EmailAddress.create(input).value).toBe(input);
  });

  it('rejects an address above the planned maximum', () => {
    const localPart = 'a'.repeat(65);
    const domain = [63, 63, 63, 61, 1]
      .map((length) => 'b'.repeat(length))
      .join('.');

    expectInvalidEmail(`${localPart}@${domain}`, 'TOO_LONG');
  });

  it.each(['', '   '])('rejects an empty address after trim: %p', (input) => {
    expectInvalidEmail(input, 'EMPTY');
  });

  it.each([
    'maria.example.com',
    '@example.com',
    'maria@',
    'maria@@example.com',
    'maria@example',
    'maria @example.com',
    '.maria@example.com',
    'maria.@example.com',
    'maria..souza@example.com',
    'maria@example..com',
    'maria@-example.com',
    'maria@example-.com',
  ])('rejects an invalid format: %p', (input) => {
    expectInvalidEmail(input, 'INVALID_FORMAT');
  });

  it('rejects a local part above 64 characters', () => {
    expectInvalidEmail(`${'a'.repeat(65)}@example.com`, 'INVALID_FORMAT');
  });

  it('rejects a domain label above 63 characters', () => {
    expectInvalidEmail(
      `pessoa@${'a'.repeat(64)}.example.com`,
      'INVALID_FORMAT',
    );
  });
});
