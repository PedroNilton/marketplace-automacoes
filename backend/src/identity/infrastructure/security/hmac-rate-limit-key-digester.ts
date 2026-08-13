import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { Environment } from '../../../config/environment';
import { RateLimitKeyDigester } from '../../application/ports/rate-limit-key-digester';
import { RateLimitAction, RateLimitKeyScope } from '../../domain/rate-limit';

@Injectable()
export class HmacRateLimitKeyDigester extends RateLimitKeyDigester {
  private readonly secret: string;

  constructor(config: ConfigService<Environment, true>) {
    super();
    this.secret = config.get('AUTH_HMAC_SECRET', { infer: true });
  }

  digest(
    action: RateLimitAction,
    scope: RateLimitKeyScope,
    identifier: string,
  ): string {
    const message = `${action}\u0000${scope}\u0000${identifier}`;

    return createHmac('sha256', this.secret)
      .update(message, 'utf8')
      .digest('hex');
  }
}
