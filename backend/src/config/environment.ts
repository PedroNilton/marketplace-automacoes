import { z } from 'zod';

const portSchema = z.coerce.number().int().min(1).max(65535);

const environmentBooleanSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const databaseUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
    'must use the postgres or postgresql protocol',
  );

export const environmentSchema = z.object({
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
