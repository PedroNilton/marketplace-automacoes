import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Environment } from '../../../config/environment';
import { AuthenticationRequiredError } from '../../../identity/application/errors/authentication-required.error';
import { GetCurrentIdentity } from '../../../identity/application/get-current-identity';
import { attachRequestIdentity } from '../../../identity/infrastructure/http/request-identity';
import { SessionCookie } from '../../../identity/infrastructure/http/session-cookie';
import { timingSafeEqual } from 'node:crypto';
import { CsrfValidationFailedError } from './csrf-validation-failed.error';
import { OriginValidationFailedError } from './origin-validation-failed.error';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const JSON_BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

@Injectable()
export class BrowserProtectionGuard implements CanActivate {
  private readonly frontendOrigin: string;

  constructor(
    config: ConfigService<Environment, true>,
    private readonly getCurrentIdentity: GetCurrentIdentity,
    private readonly sessionCookie: SessionCookie,
  ) {
    this.frontendOrigin = config.get('FRONTEND_ORIGIN', { infer: true });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    if (!UNSAFE_METHODS.has(method)) {
      return true;
    }

    if (request.headers.origin !== this.frontendOrigin) {
      throw new OriginValidationFailedError();
    }

    if (JSON_BODY_METHODS.has(method) && !hasJsonContentType(request)) {
      throw new UnsupportedMediaTypeException();
    }

    const sessionToken = this.sessionCookie.read(request.headers.cookie);
    if (!sessionToken) {
      return true;
    }

    try {
      const identity = await this.getCurrentIdentity.execute({ sessionToken });
      const csrfToken = request.headers['x-csrf-token'];

      if (
        typeof csrfToken !== 'string' ||
        !constantTimeEqual(csrfToken, identity.session.csrfToken)
      ) {
        throw new CsrfValidationFailedError();
      }

      attachRequestIdentity(request, identity);
    } catch (error) {
      if (error instanceof AuthenticationRequiredError) {
        return true;
      }

      throw error;
    }

    return true;
  }
}

function constantTimeEqual(received: string, expected: string): boolean {
  const receivedBytes = Buffer.from(received, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');

  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}

function hasJsonContentType(request: Request): boolean {
  const contentType = request.headers['content-type'];

  if (typeof contentType !== 'string') {
    return false;
  }

  return (
    contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json'
  );
}
