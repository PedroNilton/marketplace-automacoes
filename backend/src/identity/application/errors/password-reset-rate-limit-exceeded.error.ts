export class PasswordResetRateLimitExceededError extends Error {
  readonly code = 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED';

  constructor(readonly retryAfterSeconds: number) {
    super('The password reset request limit was exceeded.');
    this.name = PasswordResetRateLimitExceededError.name;
  }
}
