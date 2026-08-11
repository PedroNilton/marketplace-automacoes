import { InvalidPasswordError } from './invalid-password.error';
import type { PasswordBlocklist } from './password-blocklist';

const MINIMUM_PASSWORD_LENGTH = 15;
const MAXIMUM_PASSWORD_LENGTH = 128;

export class PasswordPolicy {
  static readonly minimumLength = MINIMUM_PASSWORD_LENGTH;
  static readonly maximumLength = MAXIMUM_PASSWORD_LENGTH;

  constructor(private readonly blocklist: PasswordBlocklist) {}

  validate(password: string, confirmation: string): void {
    const length = Array.from(password).length;

    if (length < MINIMUM_PASSWORD_LENGTH) {
      throw new InvalidPasswordError('TOO_SHORT');
    }

    if (length > MAXIMUM_PASSWORD_LENGTH) {
      throw new InvalidPasswordError('TOO_LONG');
    }

    if (password !== confirmation) {
      throw new InvalidPasswordError('CONFIRMATION_MISMATCH');
    }

    if (this.blocklist.contains(password)) {
      throw new InvalidPasswordError('BLOCKED');
    }
  }
}
