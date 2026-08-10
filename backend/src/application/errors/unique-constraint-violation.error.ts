export class UniqueConstraintViolationError extends Error {
  readonly code = 'UNIQUE_CONSTRAINT_VIOLATION';

  constructor(
    readonly fields: readonly string[],
    options?: ErrorOptions,
  ) {
    super('A persisted value must be unique.', options);
    this.name = UniqueConstraintViolationError.name;
  }
}
