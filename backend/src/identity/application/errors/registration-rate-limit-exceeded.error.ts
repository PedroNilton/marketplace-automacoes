export class RegistrationRateLimitExceededError extends Error {
  readonly code = 'REGISTRATION_RATE_LIMIT_EXCEEDED';

  constructor(readonly retryAfterSeconds: number) {
    super('The registration rate limit was exceeded.');
    this.name = RegistrationRateLimitExceededError.name;
  }
}
