import type { Request } from 'express';
import { AuthenticationRequiredError } from '../../application/errors/authentication-required.error';

export interface RequestIdentity {
  readonly user: {
    readonly id: string;
    readonly displayName: string;
    readonly emailVerified: boolean;
    readonly platformRole: 'MEMBER' | 'ADMIN';
  };
  readonly session: {
    readonly restricted: boolean;
    readonly csrfToken: string;
  };
}

const REQUEST_IDENTITY = Symbol('requestIdentity');

type RequestWithIdentity = Request & {
  [REQUEST_IDENTITY]?: RequestIdentity;
};

export function attachRequestIdentity(
  request: Request,
  identity: RequestIdentity,
): void {
  Object.defineProperty(request, REQUEST_IDENTITY, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: identity,
  });
}

export function requireRequestIdentity(request: Request): RequestIdentity {
  const identity = (request as RequestWithIdentity)[REQUEST_IDENTITY];

  if (!identity) {
    throw new AuthenticationRequiredError();
  }

  return identity;
}
