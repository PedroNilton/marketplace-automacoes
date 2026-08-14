import { RateLimitAction, RateLimitState } from '../../domain/rate-limit';

export interface RegisterRateLimitAttemptInput {
  readonly action: RateLimitAction;
  readonly keyDigest: string;
  readonly attemptedAt: Date;
  readonly windowDurationSeconds: number;
  readonly maximumAttempts: number;
  readonly blockDurationSeconds: number;
}

export abstract class RateLimitRepository {
  abstract registerAttempt(
    input: RegisterRateLimitAttemptInput,
  ): Promise<RateLimitState>;

  abstract reset(action: RateLimitAction, keyDigest: string): Promise<boolean>;
}
