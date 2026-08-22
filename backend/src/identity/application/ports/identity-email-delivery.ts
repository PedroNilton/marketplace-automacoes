export interface EmailVerificationDelivery {
  readonly recipient: string;
  readonly displayName: string;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface PasswordResetDelivery {
  readonly recipient: string;
  readonly displayName: string;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface PasswordChangedDelivery {
  readonly recipient: string;
  readonly displayName: string;
}

export abstract class IdentityEmailDelivery {
  abstract sendEmailVerification(
    delivery: EmailVerificationDelivery,
  ): Promise<void>;

  abstract sendPasswordReset(delivery: PasswordResetDelivery): Promise<void>;

  abstract sendPasswordChanged(
    delivery: PasswordChangedDelivery,
  ): Promise<void>;
}
