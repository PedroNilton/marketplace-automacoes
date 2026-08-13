import { RateLimitDecision, RateLimitState } from '../domain/rate-limit';
import { Clock } from './ports/clock';

export class RateLimitDecisions {
  constructor(private readonly clock: Clock) {}

  evaluate(state: RateLimitState): RateLimitDecision {
    const blockedUntil = state.blockedUntil;
    const remainingMilliseconds = blockedUntil
      ? blockedUntil.getTime() - this.clock.now().getTime()
      : 0;

    if (remainingMilliseconds <= 0) {
      return { limited: false, retryAfterSeconds: null };
    }

    return {
      limited: true,
      retryAfterSeconds: Math.ceil(remainingMilliseconds / 1_000),
    };
  }
}
