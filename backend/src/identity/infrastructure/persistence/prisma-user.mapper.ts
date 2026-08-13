import { User as PrismaUser } from '../../../generated/prisma/client';
import { EmailAddress } from '../../domain/email-address';
import { UserAccount } from '../../domain/user-account';

export class PrismaUserMapper {
  static toDomain(user: PrismaUser): UserAccount {
    return {
      id: user.id,
      displayName: user.displayName,
      email: EmailAddress.create(user.email),
      passwordHash: user.passwordHash,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      platformRole: user.platformRole,
      termsVersion: user.termsVersion,
      privacyVersion: user.privacyVersion,
      legalAcceptedAt: user.legalAcceptedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
