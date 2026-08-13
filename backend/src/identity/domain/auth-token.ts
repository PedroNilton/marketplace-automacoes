export const AUTH_TOKEN_PURPOSES = [
  'EMAIL_VERIFICATION',
  'PASSWORD_RESET',
] as const;

export type AuthTokenPurpose = (typeof AUTH_TOKEN_PURPOSES)[number];

export interface AuthToken {
  readonly id: string;
  readonly userId: string;
  readonly purpose: AuthTokenPurpose;
  readonly tokenDigest: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly invalidatedAt: Date | null;
}
