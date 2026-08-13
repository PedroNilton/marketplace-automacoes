import { AuthToken as PrismaAuthToken } from '../../../generated/prisma/client';
import { AuthToken } from '../../domain/auth-token';

export class PrismaAuthTokenMapper {
  static toDomain(token: PrismaAuthToken): AuthToken {
    return {
      id: token.id,
      userId: token.userId,
      purpose: token.purpose,
      tokenDigest: token.tokenDigest,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      consumedAt: token.consumedAt,
      invalidatedAt: token.invalidatedAt,
    };
  }
}
