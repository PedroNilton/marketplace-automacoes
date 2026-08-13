import { PlatformRole } from './user-account';

export const SESSION_REVOKE_REASONS = [
  'LOGOUT',
  'PASSWORD_RESET',
  'ACCOUNT_SUSPENSION',
  'SECURITY',
] as const;

export type SessionRevokeReason = (typeof SESSION_REVOKE_REASONS)[number];

export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly tokenDigest: string;
  readonly csrfDigest: string;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
  readonly idleExpiresAt: Date;
  readonly absoluteExpiresAt: Date;
  readonly revokedAt: Date | null;
  readonly revokeReason: SessionRevokeReason | null;
}

export interface SessionIdentity {
  readonly userId: string;
  readonly emailVerifiedAt: Date | null;
  readonly platformRole: PlatformRole;
}

export interface ResolvedSession {
  readonly session: Session;
  readonly identity: SessionIdentity;
}
