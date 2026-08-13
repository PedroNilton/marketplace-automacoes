export const RATE_LIMIT_ACTIONS = [
  'LOGIN',
  'REGISTRATION',
  'EMAIL_RESEND',
  'PASSWORD_RESET',
  'AUTH_TOKEN_CONFIRMATION',
] as const;

export type RateLimitAction = (typeof RATE_LIMIT_ACTIONS)[number];

export const RATE_LIMIT_KEY_SCOPES = ['ACCOUNT', 'ORIGIN'] as const;

export type RateLimitKeyScope = (typeof RATE_LIMIT_KEY_SCOPES)[number];

export interface RateLimitState {
  readonly action: RateLimitAction;
  readonly keyDigest: string;
  readonly windowStartedAt: Date;
  readonly attemptCount: number;
  readonly blockedUntil: Date | null;
  readonly updatedAt: Date;
}

export interface RateLimitDecision {
  readonly limited: boolean;
  readonly retryAfterSeconds: number | null;
}
