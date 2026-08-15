import { TransactionManager } from '../../application/ports/transaction-manager';
import { AuthTokenRepository } from './ports/auth-token-repository';
import { Clock } from './ports/clock';
import { TokenDigester } from './ports/token-digester';
import { UserRepository } from './ports/user-repository';

const MAXIMUM_RAW_TOKEN_LENGTH = 512;

export interface ConfirmEmailVerificationInput {
  readonly token: string;
}

export type ConfirmEmailVerificationResult =
  { readonly status: 'VERIFIED' } | { readonly status: 'INVALID_OR_EXPIRED' };

export interface ConfirmEmailVerificationDependencies {
  readonly authTokens: AuthTokenRepository;
  readonly users: UserRepository;
  readonly transactions: TransactionManager;
  readonly tokenDigester: TokenDigester;
  readonly clock: Clock;
}

export class ConfirmEmailVerification {
  constructor(
    private readonly dependencies: ConfirmEmailVerificationDependencies,
  ) {}

  execute(
    input: ConfirmEmailVerificationInput,
  ): Promise<ConfirmEmailVerificationResult> {
    if (!isSafeTokenInput(input.token)) {
      return Promise.resolve({ status: 'INVALID_OR_EXPIRED' });
    }

    const confirmedAt = this.dependencies.clock.now();
    const tokenDigest = this.dependencies.tokenDigester.digest(input.token);

    return this.dependencies.transactions.run(async () => {
      const token = await this.dependencies.authTokens.consume({
        purpose: 'EMAIL_VERIFICATION',
        tokenDigest,
        consumedAt: confirmedAt,
      });

      if (!token) {
        return { status: 'INVALID_OR_EXPIRED' };
      }

      const user = await this.dependencies.users.markEmailVerified(
        token.userId,
        confirmedAt,
      );

      if (!user) {
        throw new Error(
          'Email verification token references a missing user account.',
        );
      }

      await this.dependencies.authTokens.invalidatePending(
        token.userId,
        'EMAIL_VERIFICATION',
        confirmedAt,
      );

      return { status: 'VERIFIED' };
    });
  }
}

function isSafeTokenInput(token: string): boolean {
  return token.length > 0 && token.length <= MAXIMUM_RAW_TOKEN_LENGTH;
}
