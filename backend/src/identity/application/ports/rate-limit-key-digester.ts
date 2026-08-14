import { RateLimitAction, RateLimitKeyScope } from '../../domain/rate-limit';

export abstract class RateLimitKeyDigester {
  abstract digest(
    action: RateLimitAction,
    scope: RateLimitKeyScope,
    identifier: string,
  ): string;
}
