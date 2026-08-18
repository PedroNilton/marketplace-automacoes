import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionManager } from '../application/ports/transaction-manager';
import { Environment } from '../config/environment';
import { ConfirmEmailVerification } from './application/confirm-email-verification';
import { ConfirmPasswordReset } from './application/confirm-password-reset';
import { GetCurrentIdentity } from './application/get-current-identity';
import { LoginUser } from './application/login-user';
import { LogoutSession } from './application/logout-session';
import { AuthTokenRepository } from './application/ports/auth-token-repository';
import { Clock } from './application/ports/clock';
import { CsrfTokenDeriver } from './application/ports/csrf-token-deriver';
import { PasswordHasher } from './application/ports/password-hasher';
import { RateLimitKeyDigester } from './application/ports/rate-limit-key-digester';
import { RateLimitRepository } from './application/ports/rate-limit-repository';
import { SecureTokenGenerator } from './application/ports/secure-token-generator';
import { SessionRepository } from './application/ports/session-repository';
import { TokenDigester } from './application/ports/token-digester';
import { UserRepository } from './application/ports/user-repository';
import { RateLimitDecisions } from './application/rate-limit-decisions';
import { RegisterUser } from './application/register-user';
import { RequestPasswordReset } from './application/request-password-reset';
import { ResendEmailVerification } from './application/resend-email-verification';
import { PasswordPolicy } from './domain/password-policy';
import { Argon2idPasswordHasher } from './infrastructure/password/argon2id-password-hasher';
import { LocalPasswordBlocklist } from './infrastructure/password/local-password-blocklist';
import { IdentityPersistenceModule } from './infrastructure/persistence/identity-persistence.module';
import { NodeSecureTokenGenerator } from './infrastructure/security/node-secure-token-generator';
import { Sha256TokenDigester } from './infrastructure/security/sha256-token-digester';
import { SystemClock } from './infrastructure/security/system-clock';

const LOGIN_WINDOW_SECONDS = 900;
const REGISTRATION_WINDOW_SECONDS = 3_600;
const REGISTRATION_MAXIMUM_ATTEMPTS = 10;
const DAILY_WINDOW_SECONDS = 86_400;
const HOURLY_WINDOW_SECONDS = 3_600;
const DUMMY_LOGIN_PASSWORD =
  'credencial fictícia somente para equivalência temporal';

@Module({
  imports: [IdentityPersistenceModule],
  providers: [
    NodeSecureTokenGenerator,
    Sha256TokenDigester,
    SystemClock,
    {
      provide: SecureTokenGenerator,
      useExisting: NodeSecureTokenGenerator,
    },
    {
      provide: TokenDigester,
      useExisting: Sha256TokenDigester,
    },
    {
      provide: Clock,
      useExisting: SystemClock,
    },
    {
      provide: PasswordHasher,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        Argon2idPasswordHasher.fromEnvironment({
          ARGON2_MEMORY_KIB: config.get('ARGON2_MEMORY_KIB', { infer: true }),
          ARGON2_ITERATIONS: config.get('ARGON2_ITERATIONS', { infer: true }),
          ARGON2_PARALLELISM: config.get('ARGON2_PARALLELISM', { infer: true }),
        }),
    },
    {
      provide: PasswordPolicy,
      useFactory: () => new PasswordPolicy(new LocalPasswordBlocklist()),
    },
    {
      provide: RateLimitDecisions,
      inject: [Clock],
      useFactory: (clock: Clock) => new RateLimitDecisions(clock),
    },
    {
      provide: RegisterUser,
      inject: [
        UserRepository,
        AuthTokenRepository,
        TransactionManager,
        PasswordPolicy,
        PasswordHasher,
        SecureTokenGenerator,
        TokenDigester,
        RateLimitRepository,
        RateLimitKeyDigester,
        RateLimitDecisions,
        Clock,
        ConfigService,
      ],
      useFactory: (
        users: UserRepository,
        authTokens: AuthTokenRepository,
        transactions: TransactionManager,
        passwordPolicy: PasswordPolicy,
        passwordHasher: PasswordHasher,
        secureTokens: SecureTokenGenerator,
        tokenDigester: TokenDigester,
        rateLimits: RateLimitRepository,
        rateLimitKeyDigester: RateLimitKeyDigester,
        rateLimitDecisions: RateLimitDecisions,
        clock: Clock,
        config: ConfigService<Environment, true>,
      ) =>
        new RegisterUser(
          {
            users,
            authTokens,
            transactions,
            passwordPolicy,
            passwordHasher,
            secureTokens,
            tokenDigester,
            rateLimits,
            rateLimitKeyDigester,
            rateLimitDecisions,
            clock,
          },
          {
            currentTermsVersion: config.get('CURRENT_TERMS_VERSION', {
              infer: true,
            }),
            currentPrivacyVersion: config.get('CURRENT_PRIVACY_VERSION', {
              infer: true,
            }),
            verificationTokenTtlSeconds: config.get('EMAIL_VERIFICATION_TTL', {
              infer: true,
            }),
            rateLimit: {
              windowDurationSeconds: REGISTRATION_WINDOW_SECONDS,
              maximumAttempts: REGISTRATION_MAXIMUM_ATTEMPTS,
              blockDurationSeconds: config.get('LOGIN_TEMP_BLOCK_MAX', {
                infer: true,
              }),
            },
          },
        ),
    },
    {
      provide: ConfirmEmailVerification,
      inject: [
        AuthTokenRepository,
        UserRepository,
        TransactionManager,
        TokenDigester,
        Clock,
      ],
      useFactory: (
        authTokens: AuthTokenRepository,
        users: UserRepository,
        transactions: TransactionManager,
        tokenDigester: TokenDigester,
        clock: Clock,
      ) =>
        new ConfirmEmailVerification({
          authTokens,
          users,
          transactions,
          tokenDigester,
          clock,
        }),
    },
    {
      provide: ResendEmailVerification,
      inject: [
        UserRepository,
        AuthTokenRepository,
        TransactionManager,
        SecureTokenGenerator,
        TokenDigester,
        RateLimitRepository,
        RateLimitKeyDigester,
        RateLimitDecisions,
        Clock,
        ConfigService,
      ],
      useFactory: (
        users: UserRepository,
        authTokens: AuthTokenRepository,
        transactions: TransactionManager,
        secureTokens: SecureTokenGenerator,
        tokenDigester: TokenDigester,
        rateLimits: RateLimitRepository,
        rateLimitKeyDigester: RateLimitKeyDigester,
        rateLimitDecisions: RateLimitDecisions,
        clock: Clock,
        config: ConfigService<Environment, true>,
      ) =>
        new ResendEmailVerification(
          {
            users,
            authTokens,
            transactions,
            secureTokens,
            tokenDigester,
            rateLimits,
            rateLimitKeyDigester,
            rateLimitDecisions,
            clock,
          },
          {
            verificationTokenTtlSeconds: config.get('EMAIL_VERIFICATION_TTL', {
              infer: true,
            }),
            cooldownSeconds: config.get('EMAIL_RESEND_COOLDOWN', {
              infer: true,
            }),
            maximumAttemptsPerDay: config.get('EMAIL_RESEND_MAX_PER_DAY', {
              infer: true,
            }),
            dailyWindowDurationSeconds: DAILY_WINDOW_SECONDS,
          },
        ),
    },
    {
      provide: LoginUser,
      inject: [
        UserRepository,
        SessionRepository,
        TransactionManager,
        PasswordHasher,
        SecureTokenGenerator,
        CsrfTokenDeriver,
        TokenDigester,
        RateLimitRepository,
        RateLimitKeyDigester,
        RateLimitDecisions,
        Clock,
        ConfigService,
      ],
      useFactory: async (
        users: UserRepository,
        sessions: SessionRepository,
        transactions: TransactionManager,
        passwordHasher: PasswordHasher,
        secureTokens: SecureTokenGenerator,
        csrfTokens: CsrfTokenDeriver,
        tokenDigester: TokenDigester,
        rateLimits: RateLimitRepository,
        rateLimitKeyDigester: RateLimitKeyDigester,
        rateLimitDecisions: RateLimitDecisions,
        clock: Clock,
        config: ConfigService<Environment, true>,
      ) =>
        new LoginUser(
          {
            users,
            sessions,
            transactions,
            passwordHasher,
            secureTokens,
            csrfTokens,
            tokenDigester,
            rateLimits,
            rateLimitKeyDigester,
            rateLimitDecisions,
            clock,
          },
          {
            sessionAbsoluteTtlSeconds: config.get('SESSION_ABSOLUTE_TTL', {
              infer: true,
            }),
            sessionIdleTtlSeconds: config.get('SESSION_IDLE_TTL', {
              infer: true,
            }),
            dummyPasswordHash: await passwordHasher.hash(DUMMY_LOGIN_PASSWORD),
            rateLimit: {
              windowDurationSeconds: LOGIN_WINDOW_SECONDS,
              maximumAttempts: config.get('LOGIN_PROGRESSIVE_DELAY_AFTER', {
                infer: true,
              }),
              blockDurationSeconds: config.get('LOGIN_TEMP_BLOCK_MAX', {
                infer: true,
              }),
            },
          },
        ),
    },
    {
      provide: GetCurrentIdentity,
      inject: [
        SessionRepository,
        CsrfTokenDeriver,
        TokenDigester,
        Clock,
        ConfigService,
      ],
      useFactory: (
        sessions: SessionRepository,
        csrfTokens: CsrfTokenDeriver,
        tokenDigester: TokenDigester,
        clock: Clock,
        config: ConfigService<Environment, true>,
      ) =>
        new GetCurrentIdentity(
          { sessions, csrfTokens, tokenDigester, clock },
          {
            sessionIdleTtlSeconds: config.get('SESSION_IDLE_TTL', {
              infer: true,
            }),
            activityTouchIntervalSeconds: config.get(
              'SESSION_ACTIVITY_TOUCH_INTERVAL',
              { infer: true },
            ),
          },
        ),
    },
    {
      provide: LogoutSession,
      inject: [SessionRepository, TokenDigester, Clock],
      useFactory: (
        sessions: SessionRepository,
        tokenDigester: TokenDigester,
        clock: Clock,
      ) => new LogoutSession({ sessions, tokenDigester, clock }),
    },
    {
      provide: RequestPasswordReset,
      inject: [
        UserRepository,
        AuthTokenRepository,
        TransactionManager,
        SecureTokenGenerator,
        TokenDigester,
        RateLimitRepository,
        RateLimitKeyDigester,
        RateLimitDecisions,
        Clock,
        ConfigService,
      ],
      useFactory: (
        users: UserRepository,
        authTokens: AuthTokenRepository,
        transactions: TransactionManager,
        secureTokens: SecureTokenGenerator,
        tokenDigester: TokenDigester,
        rateLimits: RateLimitRepository,
        rateLimitKeyDigester: RateLimitKeyDigester,
        rateLimitDecisions: RateLimitDecisions,
        clock: Clock,
        config: ConfigService<Environment, true>,
      ) =>
        new RequestPasswordReset(
          {
            users,
            authTokens,
            transactions,
            secureTokens,
            tokenDigester,
            rateLimits,
            rateLimitKeyDigester,
            rateLimitDecisions,
            clock,
          },
          {
            resetTokenTtlSeconds: config.get('PASSWORD_RESET_TTL', {
              infer: true,
            }),
            maximumAttemptsPerHour: config.get('PASSWORD_RESET_MAX_PER_HOUR', {
              infer: true,
            }),
            hourlyWindowDurationSeconds: HOURLY_WINDOW_SECONDS,
          },
        ),
    },
    {
      provide: ConfirmPasswordReset,
      inject: [
        AuthTokenRepository,
        UserRepository,
        SessionRepository,
        TransactionManager,
        PasswordPolicy,
        PasswordHasher,
        TokenDigester,
        Clock,
      ],
      useFactory: (
        authTokens: AuthTokenRepository,
        users: UserRepository,
        sessions: SessionRepository,
        transactions: TransactionManager,
        passwordPolicy: PasswordPolicy,
        passwordHasher: PasswordHasher,
        tokenDigester: TokenDigester,
        clock: Clock,
      ) =>
        new ConfirmPasswordReset({
          authTokens,
          users,
          sessions,
          transactions,
          passwordPolicy,
          passwordHasher,
          tokenDigester,
          clock,
        }),
    },
  ],
  exports: [
    RegisterUser,
    ConfirmEmailVerification,
    ResendEmailVerification,
    LoginUser,
    GetCurrentIdentity,
    LogoutSession,
    RequestPasswordReset,
    ConfirmPasswordReset,
  ],
})
export class IdentityApplicationModule {}
