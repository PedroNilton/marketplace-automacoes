import { InvalidEmailError } from './invalid-email.error';

const MAX_EMAIL_LENGTH = 320;
const MAX_LOCAL_PART_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 255;
const MAX_DOMAIN_LABEL_LENGTH = 63;
const LOCAL_PART_PATTERN = /^[\p{L}\p{N}!#$%&'*+/=?^_`{|}~.-]+$/u;
const DOMAIN_LABEL_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;

export class EmailAddress {
  static readonly maxLength = MAX_EMAIL_LENGTH;

  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(input: string): EmailAddress {
    const value = input.trim().toLowerCase();

    if (value.length === 0) {
      throw new InvalidEmailError('EMPTY');
    }

    if (value.length > MAX_EMAIL_LENGTH) {
      throw new InvalidEmailError('TOO_LONG');
    }

    if (!EmailAddress.hasValidFormat(value)) {
      throw new InvalidEmailError('INVALID_FORMAT');
    }

    return new EmailAddress(value);
  }

  equals(other: EmailAddress): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  private static hasValidFormat(value: string): boolean {
    const separator = value.indexOf('@');

    if (separator <= 0 || separator !== value.lastIndexOf('@')) {
      return false;
    }

    const localPart = value.slice(0, separator);
    const domain = value.slice(separator + 1);

    return (
      EmailAddress.hasValidLocalPart(localPart) &&
      EmailAddress.hasValidDomain(domain)
    );
  }

  private static hasValidLocalPart(localPart: string): boolean {
    return (
      localPart.length <= MAX_LOCAL_PART_LENGTH &&
      LOCAL_PART_PATTERN.test(localPart) &&
      !localPart.startsWith('.') &&
      !localPart.endsWith('.') &&
      !localPart.includes('..')
    );
  }

  private static hasValidDomain(domain: string): boolean {
    if (domain.length === 0 || domain.length > MAX_DOMAIN_LENGTH) {
      return false;
    }

    const labels = domain.split('.');

    return (
      labels.length >= 2 &&
      labels.every(
        (label) =>
          label.length <= MAX_DOMAIN_LABEL_LENGTH &&
          DOMAIN_LABEL_PATTERN.test(label),
      )
    );
  }
}
