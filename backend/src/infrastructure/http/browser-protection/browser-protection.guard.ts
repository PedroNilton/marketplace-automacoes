import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Environment } from '../../../config/environment';
import { OriginValidationFailedError } from './origin-validation-failed.error';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const JSON_BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

@Injectable()
export class BrowserProtectionGuard implements CanActivate {
  private readonly frontendOrigin: string;

  constructor(config: ConfigService<Environment, true>) {
    this.frontendOrigin = config.get('FRONTEND_ORIGIN', { infer: true });
  }

  canActivate(context: ExecutionContext): boolean {
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

    return true;
  }
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
