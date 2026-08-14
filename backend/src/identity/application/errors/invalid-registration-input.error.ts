export type InvalidRegistrationInputReason =
  | 'DISPLAY_NAME_EMPTY'
  | 'DISPLAY_NAME_TOO_LONG'
  | 'TERMS_NOT_ACCEPTED'
  | 'PRIVACY_NOT_ACCEPTED';

export class InvalidRegistrationInputError extends Error {
  readonly code = 'INVALID_REGISTRATION_INPUT';

  constructor(readonly reason: InvalidRegistrationInputReason) {
    super('The registration input is invalid.');
    this.name = InvalidRegistrationInputError.name;
  }
}
