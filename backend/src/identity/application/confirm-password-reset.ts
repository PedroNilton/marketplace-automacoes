import { TransactionManager } from '../../application/ports/transaction-manager';
import { PasswordPolicy } from '../domain/password-policy';
import { AuthTokenRepository } from './ports/auth-token-repository';
import { Clock } from './ports/clock';
import { PasswordHasher } from './ports/password-hasher';
import { SessionRepository } from './ports/session-repository';
import { TokenDigester } from './ports/token-digester';
import { UserRepository } from './ports/user-repository';
import { IdentityEmailDelivery } from './ports/identity-email-delivery';

const MAXIMUM_RAW_TOKEN_LENGTH = 512;

export interface ConfirmPasswordResetInput {
  readonly token: string;
  readonly password: string;
  readonly passwordConfirmation: string;
}

export interface PasswordChangedNotificationRequest {
  readonly recipient: string;
  readonly displayName: string;
}

export type ConfirmPasswordResetResult =
  | {
      readonly status: 'RESET';
      readonly notification: PasswordChangedNotificationRequest;
    }
  | { readonly status: 'INVALID_OR_EXPIRED'; readonly notification: null };

export interface ConfirmPasswordResetDependencies {
  readonly authTokens: AuthTokenRepository;
  readonly users: UserRepository;
  readonly sessions: SessionRepository;
  readonly transactions: TransactionManager;
  readonly passwordPolicy: PasswordPolicy;
  readonly passwordHasher: PasswordHasher;
  readonly tokenDigester: TokenDigester;
  readonly clock: Clock;
  readonly emailDelivery: IdentityEmailDelivery;
}

export class ConfirmPasswordReset {
  constructor(
    private readonly dependencies: ConfirmPasswordResetDependencies,
  ) {}

  async execute(
    input: ConfirmPasswordResetInput,
  ): Promise<ConfirmPasswordResetResult> {
    if (!isSafeTokenInput(input.token)) {
      return invalidResult();
    }

    this.dependencies.passwordPolicy.validate(
      input.password,
      input.passwordConfirmation,
    );

    const confirmedAt = this.dependencies.clock.now();
    const tokenInput = {
      purpose: 'PASSWORD_RESET' as const,
      tokenDigest: this.dependencies.tokenDigester.digest(input.token),
      consumedAt: confirmedAt,
    };
    const candidate =
      await this.dependencies.authTokens.findConsumable(tokenInput);

    if (!candidate) {
      return invalidResult();
    }

    const passwordHash = await this.dependencies.passwordHasher.hash(
      input.password,
    );

    const result: ConfirmPasswordResetResult =
      await this.dependencies.transactions.run(async () => {
        const token = await this.dependencies.authTokens.consume(tokenInput);

        if (!token) {
          return invalidResult();
        }

        const user = await this.dependencies.users.updatePasswordHash(
          token.userId,
          passwordHash,
        );

        if (!user) {
          throw new Error(
            'Password reset token references a missing user account.',
          );
        }

        await this.dependencies.sessions.revokeAllForUser(
          user.id,
          confirmedAt,
          'PASSWORD_RESET',
        );

        return {
          status: 'RESET' as const,
          notification: {
            recipient: user.email.value,
            displayName: user.displayName,
          },
        };
      });

    if (result.status === 'RESET') {
      await this.dependencies.emailDelivery.sendPasswordChanged(
        result.notification,
      );
    }

    return result;
  }
}

function isSafeTokenInput(token: string): boolean {
  return token.length > 0 && token.length <= MAXIMUM_RAW_TOKEN_LENGTH;
}

function invalidResult(): ConfirmPasswordResetResult {
  return { status: 'INVALID_OR_EXPIRED', notification: null };
}
