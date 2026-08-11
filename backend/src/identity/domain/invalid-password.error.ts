export type InvalidPasswordReason =
  'TOO_SHORT' | 'TOO_LONG' | 'CONFIRMATION_MISMATCH' | 'BLOCKED';

export class InvalidPasswordError extends Error {
  readonly code = 'INVALID_PASSWORD';

  constructor(readonly reason: InvalidPasswordReason) {
    super('The password does not meet the security policy.');
    this.name = InvalidPasswordError.name;
  }
}
