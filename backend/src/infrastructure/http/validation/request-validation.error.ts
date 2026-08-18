export interface RequestValidationIssue {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

export class RequestValidationError extends Error {
  constructor(readonly issues: readonly RequestValidationIssue[]) {
    super('The request payload is invalid.');
    this.name = 'RequestValidationError';
  }
}
