export const IDENTITY_ACCESS_POLICY = 'identityAccessPolicy';

export interface IdentityAccessPolicy {
  readonly allowRestricted: boolean;
  readonly platformRoles?: readonly ('MEMBER' | 'ADMIN')[];
}
