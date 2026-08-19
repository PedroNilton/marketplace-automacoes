import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { EmailVerificationRequiredError } from '../../application/errors/email-verification-required.error';
import { PlatformAccessDeniedError } from '../../application/errors/platform-access-denied.error';
import { GetCurrentIdentity } from '../../application/get-current-identity';
import {
  IDENTITY_ACCESS_POLICY,
  IdentityAccessPolicy,
} from './identity-access-policy';
import { attachRequestIdentity } from './request-identity';
import { SessionCookie } from './session-cookie';

@Injectable()
export class IdentityAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly getCurrentIdentity: GetCurrentIdentity,
    private readonly sessionCookie: SessionCookie,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<IdentityAccessPolicy>(
      IDENTITY_ACCESS_POLICY,
      [context.getHandler(), context.getClass()],
    );

    if (!policy) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const identity = await this.getCurrentIdentity.execute({
      sessionToken: this.sessionCookie.read(request.headers.cookie),
    });

    if (identity.session.restricted && !policy.allowRestricted) {
      throw new EmailVerificationRequiredError();
    }

    if (
      policy.platformRoles &&
      !policy.platformRoles.includes(identity.user.platformRole)
    ) {
      throw new PlatformAccessDeniedError();
    }

    attachRequestIdentity(request, identity);
    return true;
  }
}
