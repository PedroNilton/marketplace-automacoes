export class LoginRateLimitExceededError extends Error {
  readonly code = 'LOGIN_RATE_LIMIT_EXCEEDED';

  constructor(readonly retryAfterSeconds: number) {
    super('The login attempt limit was exceeded.');
    this.name = LoginRateLimitExceededError.name;
  }
}
