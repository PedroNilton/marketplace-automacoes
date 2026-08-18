import { z } from 'zod';

const portSchema = z.coerce.number().int().min(1).max(65535);

const environmentBooleanSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const positiveIntegerSchema = z.coerce.number().int().positive();
const argon2MemorySchema = z.coerce.number().int().min(19_456);
const argon2IterationsSchema = z.coerce.number().int().min(2);
const argon2ParallelismSchema = z.coerce.number().int().min(1);

const databaseUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
    'must use the postgres or postgresql protocol',
  );

export const HMAC_SECRET_PLACEHOLDER =
  'replace-with-at-least-32-random-characters';

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: portSchema.default(3001),
    API_ORIGIN: z.string().url(),
    FRONTEND_ORIGIN: z.string().url(),
    DATABASE_URL: databaseUrlSchema,
    SMTP_HOST: z.string().trim().min(1).default('127.0.0.1'),
    SMTP_PORT: portSchema.default(1025),
    SMTP_SECURE: environmentBooleanSchema.default(false),
    SMTP_FROM: z.string().email(),
    AUTH_HMAC_SECRET: z
      .string()
      .min(32)
      .refine((value) => value !== HMAC_SECRET_PLACEHOLDER, {
        message: 'must be replaced with a random secret',
      }),
    SESSION_COOKIE_NAME: z
      .string()
      .trim()
      .min(1)
      .default('marketplace_session'),
    SESSION_COOKIE_SECURE: environmentBooleanSchema.default(false),
    SESSION_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    SESSION_ABSOLUTE_TTL: positiveIntegerSchema.default(604800),
    SESSION_IDLE_TTL: positiveIntegerSchema.default(86400),
    SESSION_ACTIVITY_TOUCH_INTERVAL: positiveIntegerSchema.default(900),
    EMAIL_VERIFICATION_TTL: positiveIntegerSchema.default(86400),
    PASSWORD_RESET_TTL: positiveIntegerSchema.default(1800),
    EMAIL_RESEND_COOLDOWN: positiveIntegerSchema.default(60),
    EMAIL_RESEND_MAX_PER_DAY: positiveIntegerSchema.default(5),
    PASSWORD_RESET_MAX_PER_HOUR: positiveIntegerSchema.default(5),
    LOGIN_PROGRESSIVE_DELAY_AFTER: positiveIntegerSchema.default(5),
    LOGIN_TEMP_BLOCK_MAX: positiveIntegerSchema.default(900),
    CURRENT_TERMS_VERSION: z.string().trim().min(1).max(32).default('beta-1'),
    CURRENT_PRIVACY_VERSION: z.string().trim().min(1).max(32).default('beta-1'),
    ARGON2_MEMORY_KIB: argon2MemorySchema.default(19456),
    ARGON2_ITERATIONS: argon2IterationsSchema.default(2),
    ARGON2_PARALLELISM: argon2ParallelismSchema.default(1),
  })
  .superRefine((environment, context) => {
    if (environment.SESSION_IDLE_TTL > environment.SESSION_ABSOLUTE_TTL) {
      context.addIssue({
        code: 'custom',
        path: ['SESSION_IDLE_TTL'],
        message: 'must not exceed SESSION_ABSOLUTE_TTL',
      });
    }

    if (
      environment.SESSION_ACTIVITY_TOUCH_INTERVAL > environment.SESSION_IDLE_TTL
    ) {
      context.addIssue({
        code: 'custom',
        path: ['SESSION_ACTIVITY_TOUCH_INTERVAL'],
        message: 'must not exceed SESSION_IDLE_TTL',
      });
    }

    if (
      environment.SESSION_COOKIE_SAME_SITE === 'none' &&
      !environment.SESSION_COOKIE_SECURE
    ) {
      context.addIssue({
        code: 'custom',
        path: ['SESSION_COOKIE_SECURE'],
        message: 'must be true when SESSION_COOKIE_SAME_SITE is none',
      });
    }

    if (environment.NODE_ENV === 'production') {
      if (!environment.SESSION_COOKIE_SECURE) {
        context.addIssue({
          code: 'custom',
          path: ['SESSION_COOKIE_SECURE'],
          message: 'must be true in production',
        });
      }

      if (!environment.SESSION_COOKIE_NAME.startsWith('__Host-')) {
        context.addIssue({
          code: 'custom',
          path: ['SESSION_COOKIE_NAME'],
          message: 'must start with __Host- in production',
        });
      }

      for (const originName of ['API_ORIGIN', 'FRONTEND_ORIGIN'] as const) {
        if (new URL(environment[originName]).protocol !== 'https:') {
          context.addIssue({
            code: 'custom',
            path: [originName],
            message: 'must use HTTPS in production',
          });
        }
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export class EnvironmentValidationError extends Error {
  constructor(issues: string[]) {
    super(`Invalid environment configuration: ${issues.join('; ')}`);
    this.name = 'EnvironmentValidationError';
  }
}

export function validateEnvironment(
  values: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(values);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.map(String).join('.') || 'environment';
      return `${path}: ${issue.message}`;
    });

    throw new EnvironmentValidationError(issues);
  }

  return result.data;
}
