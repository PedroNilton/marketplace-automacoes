export class CsrfValidationFailedError extends Error {
  readonly code = 'CSRF_VALIDATION_FAILED';

  constructor() {
    super('The CSRF token is missing or invalid.');
    this.name = CsrfValidationFailedError.name;
  }
}
