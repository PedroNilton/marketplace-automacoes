export class OriginValidationFailedError extends Error {
  readonly code = 'ORIGIN_VALIDATION_FAILED';

  constructor() {
    super('The request origin is missing or not allowed.');
    this.name = OriginValidationFailedError.name;
  }
}
