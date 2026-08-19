export class EmailVerificationRequiredError extends Error {
  readonly code = 'EMAIL_VERIFICATION_REQUIRED';

  constructor() {
    super('Email verification is required.');
    this.name = EmailVerificationRequiredError.name;
  }
}
