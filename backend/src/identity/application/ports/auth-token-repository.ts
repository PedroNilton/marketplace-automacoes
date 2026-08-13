import { AuthToken, AuthTokenPurpose } from '../../domain/auth-token';

export interface IssueAuthTokenInput {
  readonly userId: string;
  readonly purpose: AuthTokenPurpose;
  readonly tokenDigest: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

export interface ConsumeAuthTokenInput {
  readonly purpose: AuthTokenPurpose;
  readonly tokenDigest: string;
  readonly consumedAt: Date;
}

export abstract class AuthTokenRepository {
  abstract issue(input: IssueAuthTokenInput): Promise<AuthToken>;

  abstract consume(input: ConsumeAuthTokenInput): Promise<AuthToken | null>;

  abstract invalidatePending(
    userId: string,
    purpose: AuthTokenPurpose,
    invalidatedAt: Date,
  ): Promise<number>;
}
