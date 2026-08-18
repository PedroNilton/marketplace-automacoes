import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const emailSchema = z.string().trim().min(1).max(254);
const passwordSchema = z.string().min(1).max(128);
const tokenSchema = z.string().trim().min(1).max(512);

export const registerUserRequestSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100),
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: passwordSchema,
    termsVersion: z.string().trim().min(1).max(32),
    privacyVersion: z.string().trim().min(1).max(32),
  })
  .strict();

export class RegisterUserRequestDto {
  @ApiProperty({ example: 'Ana Souza', maxLength: 100 })
  displayName!: string;

  @ApiProperty({ example: 'ana@example.com', maxLength: 254 })
  email!: string;

  @ApiProperty({ format: 'password', minLength: 1, maxLength: 128 })
  password!: string;

  @ApiProperty({ format: 'password', minLength: 1, maxLength: 128 })
  passwordConfirmation!: string;

  @ApiProperty({ example: 'beta-1', maxLength: 32 })
  termsVersion!: string;

  @ApiProperty({ example: 'beta-1', maxLength: 32 })
  privacyVersion!: string;
}

export const tokenConfirmationRequestSchema = z
  .object({ token: tokenSchema })
  .strict();

export class TokenConfirmationRequestDto {
  @ApiProperty({ description: 'Token de uso único recebido pelo usuário.' })
  token!: string;
}

export const emailRequestSchema = z.object({ email: emailSchema }).strict();

export class EmailRequestDto {
  @ApiProperty({ example: 'ana@example.com', maxLength: 254 })
  email!: string;
}

export const loginRequestSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    returnTo: z.string().max(2_048).optional(),
  })
  .strict();

export class LoginRequestDto {
  @ApiProperty({ example: 'ana@example.com', maxLength: 254 })
  email!: string;

  @ApiProperty({ format: 'password', minLength: 1, maxLength: 128 })
  password!: string;

  @ApiPropertyOptional({ example: '/painel', maxLength: 2_048 })
  returnTo?: string;
}

export const confirmPasswordResetRequestSchema = z
  .object({
    token: tokenSchema,
    password: passwordSchema,
    passwordConfirmation: passwordSchema,
  })
  .strict();

export class ConfirmPasswordResetRequestDto {
  @ApiProperty({ description: 'Token de uso único recebido pelo usuário.' })
  token!: string;

  @ApiProperty({ format: 'password', minLength: 1, maxLength: 128 })
  password!: string;

  @ApiProperty({ format: 'password', minLength: 1, maxLength: 128 })
  passwordConfirmation!: string;
}

export class NeutralAcceptedResponseDto {
  @ApiProperty({
    example:
      'Se a solicitação puder ser concluída, enviaremos as instruções para o e-mail informado.',
  })
  message!: string;
}

export class IdentityUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ana Souza' })
  displayName!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({ enum: ['MEMBER', 'ADMIN'] })
  platformRole!: 'MEMBER' | 'ADMIN';
}

export class CurrentSessionResponseDto {
  @ApiProperty()
  restricted!: boolean;

  @ApiProperty({ description: 'Token a enviar no cabeçalho de proteção CSRF.' })
  csrfToken!: string;
}

export class LoginSessionResponseDto extends CurrentSessionResponseDto {
  @ApiProperty({ example: '/painel' })
  returnTo!: string;
}

export class LoginResponseDto {
  @ApiProperty({ type: IdentityUserResponseDto })
  user!: IdentityUserResponseDto;

  @ApiProperty({ type: LoginSessionResponseDto })
  session!: LoginSessionResponseDto;
}

export class CurrentIdentityResponseDto {
  @ApiProperty({ type: IdentityUserResponseDto })
  user!: IdentityUserResponseDto;

  @ApiProperty({ type: CurrentSessionResponseDto })
  session!: CurrentSessionResponseDto;
}
