import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { Environment } from '../../../config/environment';
import { CsrfTokenDeriver } from '../../application/ports/csrf-token-deriver';

const CSRF_TOKEN_DOMAIN = 'marketplace-automacoes:csrf:v1';

@Injectable()
export class HmacCsrfTokenDeriver extends CsrfTokenDeriver {
  private readonly secret: string;

  constructor(config: ConfigService<Environment, true>) {
    super();
    this.secret = config.get('AUTH_HMAC_SECRET', { infer: true });
  }

  derive(sessionToken: string): string {
    return createHmac('sha256', this.secret)
      .update(`${CSRF_TOKEN_DOMAIN}\u0000${sessionToken}`, 'utf8')
      .digest('base64url');
  }
}
