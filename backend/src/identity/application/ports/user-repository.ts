import { EmailAddress } from '../../domain/email-address';
import { UserAccount, UserStatus } from '../../domain/user-account';

export interface CreateUserAccountInput {
  readonly displayName: string;
  readonly email: EmailAddress;
  readonly passwordHash: string;
  readonly termsVersion: string;
  readonly privacyVersion: string;
  readonly legalAcceptedAt: Date;
}

export abstract class UserRepository {
  abstract create(input: CreateUserAccountInput): Promise<UserAccount>;

  abstract findById(id: string): Promise<UserAccount | null>;

  abstract findByEmail(email: EmailAddress): Promise<UserAccount | null>;

  abstract markEmailVerified(
    id: string,
    verifiedAt: Date,
  ): Promise<UserAccount | null>;

  abstract updatePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<UserAccount | null>;

  abstract updateStatus(
    id: string,
    status: UserStatus,
  ): Promise<UserAccount | null>;
}
