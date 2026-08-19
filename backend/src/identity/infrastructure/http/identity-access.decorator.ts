import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { IdentityAccessGuard } from './identity-access.guard';
import {
  IDENTITY_ACCESS_POLICY,
  IdentityAccessPolicy,
} from './identity-access-policy';

export function RequireSession(): ClassDecorator & MethodDecorator {
  return protectedRoute({ allowRestricted: false });
}

export function AllowRestrictedSession(): ClassDecorator & MethodDecorator {
  return protectedRoute({ allowRestricted: true });
}

export function RequirePlatformRole(
  ...platformRoles: readonly ('MEMBER' | 'ADMIN')[]
): ClassDecorator & MethodDecorator {
  if (platformRoles.length === 0) {
    throw new RangeError('At least one platform role must be required.');
  }

  return protectedRoute({ allowRestricted: false, platformRoles });
}

function protectedRoute(
  policy: IdentityAccessPolicy,
): ClassDecorator & MethodDecorator {
  return applyDecorators(
    SetMetadata(IDENTITY_ACCESS_POLICY, policy),
    UseGuards(IdentityAccessGuard),
    ApiUnauthorizedResponse({ description: 'Autenticação necessária.' }),
    ApiForbiddenResponse({ description: 'Acesso não permitido.' }),
  );
}
