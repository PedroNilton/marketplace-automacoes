import { Session as PrismaSession } from '../../../generated/prisma/client';
import { Session } from '../../domain/session';

export class PrismaSessionMapper {
  static toDomain(session: PrismaSession): Session {
    return {
      id: session.id,
      userId: session.userId,
      tokenDigest: session.tokenDigest,
      csrfDigest: session.csrfDigest,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      idleExpiresAt: session.idleExpiresAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
      revokedAt: session.revokedAt,
      revokeReason: session.revokeReason,
    };
  }
}
