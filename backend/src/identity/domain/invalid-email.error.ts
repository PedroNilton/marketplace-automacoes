export type InvalidEmailReason = 'EMPTY' | 'TOO_LONG' | 'INVALID_FORMAT';

export class InvalidEmailError extends Error {
  readonly code = 'INVALID_EMAIL';

  constructor(readonly reason: InvalidEmailReason) {
    super('The email address is invalid.');
    this.name = InvalidEmailError.name;
  }
}
