import {
  ResolvedSession,
  Session,
  SessionRevokeReason,
} from '../../domain/session';

export interface CreateSessionInput {
  readonly userId: string;
  readonly tokenDigest: string;
  readonly csrfDigest: string;
  readonly createdAt: Date;
  readonly idleExpiresAt: Date;
  readonly absoluteExpiresAt: Date;
}

export interface TouchSessionInput {
  readonly tokenDigest: string;
  readonly touchedAt: Date;
  readonly touchIfLastSeenBefore: Date;
  readonly idleExpiresAt: Date;
}

export abstract class SessionRepository {
  abstract create(input: CreateSessionInput): Promise<Session>;

  abstract resolve(
    tokenDigest: string,
    resolvedAt: Date,
  ): Promise<ResolvedSession | null>;

  abstract touch(input: TouchSessionInput): Promise<boolean>;

  abstract revoke(
    tokenDigest: string,
    revokedAt: Date,
    reason: SessionRevokeReason,
  ): Promise<boolean>;

  abstract revokeAllForUser(
    userId: string,
    revokedAt: Date,
    reason: SessionRevokeReason,
  ): Promise<number>;
}
