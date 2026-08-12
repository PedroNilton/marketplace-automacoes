import { EmailAddress } from './email-address';

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const PLATFORM_ROLES = ['MEMBER', 'ADMIN'] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export interface UserAccount {
  readonly id: string;
  readonly displayName: string;
  readonly email: EmailAddress;
  readonly passwordHash: string;
  readonly status: UserStatus;
  readonly emailVerifiedAt: Date | null;
  readonly platformRole: PlatformRole;
  readonly termsVersion: string;
  readonly privacyVersion: string;
  readonly legalAcceptedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
