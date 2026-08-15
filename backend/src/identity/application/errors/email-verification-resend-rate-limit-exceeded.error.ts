export class EmailVerificationResendRateLimitExceededError extends Error {
  readonly code = 'EMAIL_VERIFICATION_RESEND_RATE_LIMIT_EXCEEDED';

  constructor(readonly retryAfterSeconds: number) {
    super('The email verification resend rate limit was exceeded.');
    this.name = EmailVerificationResendRateLimitExceededError.name;
  }
}
