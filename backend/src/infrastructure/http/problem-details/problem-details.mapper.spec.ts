import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { UniqueConstraintViolationError } from '../../../application/errors/unique-constraint-violation.error';
import { AccountUnavailableError } from '../../../identity/application/errors/account-unavailable.error';
import { AuthenticationRequiredError } from '../../../identity/application/errors/authentication-required.error';
import { EmailVerificationResendRateLimitExceededError } from '../../../identity/application/errors/email-verification-resend-rate-limit-exceeded.error';
import { EmailVerificationRequiredError } from '../../../identity/application/errors/email-verification-required.error';
import { InvalidLoginCredentialsError } from '../../../identity/application/errors/invalid-login-credentials.error';
import { InvalidOrExpiredTokenError } from '../../../identity/application/errors/invalid-or-expired-token.error';
import { InvalidRegistrationInputError } from '../../../identity/application/errors/invalid-registration-input.error';
import { LoginRateLimitExceededError } from '../../../identity/application/errors/login-rate-limit-exceeded.error';
import { PasswordResetRateLimitExceededError } from '../../../identity/application/errors/password-reset-rate-limit-exceeded.error';
import { PlatformAccessDeniedError } from '../../../identity/application/errors/platform-access-denied.error';
import { RegistrationRateLimitExceededError } from '../../../identity/application/errors/registration-rate-limit-exceeded.error';
import { InvalidEmailError } from '../../../identity/domain/invalid-email.error';
import { InvalidPasswordError } from '../../../identity/domain/invalid-password.error';
import { ProblemDetailsMapper } from './problem-details.mapper';
import { RequestValidationError } from '../validation/request-validation.error';
import { OriginValidationFailedError } from '../browser-protection/origin-validation-failed.error';

describe('ProblemDetailsMapper', () => {
  const mapper = new ProblemDetailsMapper();

  it.each([
    [
      new RequestValidationError([
        {
          field: 'email',
          code: 'invalid_value',
          message: 'Informe um valor válido.',
        },
      ]),
      'email',
      'invalid_value',
    ],
    [new InvalidEmailError('EMPTY'), 'email', 'email_required'],
    [new InvalidEmailError('INVALID_FORMAT'), 'email', 'email_invalid_format'],
    [new InvalidPasswordError('TOO_SHORT'), 'password', 'password_too_short'],
    [
      new InvalidPasswordError('CONFIRMATION_MISMATCH'),
      'passwordConfirmation',
      'password_confirmation_mismatch',
    ],
    [
      new InvalidRegistrationInputError('DISPLAY_NAME_EMPTY'),
      'displayName',
      'display_name_required',
    ],
    [
      new InvalidRegistrationInputError('TERMS_NOT_ACCEPTED'),
      'termsVersion',
      'terms_not_accepted',
    ],
  ])(
    'maps a correctable domain error to one safe field error',
    (exception, field, code) => {
      expect(mapper.map(exception)).toMatchObject({
        status: 422,
        typeSlug: 'validation-error',
        code: 'validation_error',
        errors: [{ field, code }],
      });
    },
  );

  it('maps invalid or expired tokens to the generic public contract', () => {
    expect(mapper.map(new InvalidOrExpiredTokenError())).toMatchObject({
      status: 400,
      code: 'invalid_or_expired_token',
    });
  });

  it.each([
    [new AuthenticationRequiredError(), 'authentication_required'],
    [new UnauthorizedException('unsafe'), 'authentication_required'],
    [new InvalidLoginCredentialsError(), 'invalid_credentials'],
    [new AccountUnavailableError(), 'account_unavailable'],
    [new EmailVerificationRequiredError(), 'email_verification_required'],
    [new PlatformAccessDeniedError(), 'access_denied'],
    [new OriginValidationFailedError(), 'origin_validation_failed'],
    [new ForbiddenException('unsafe'), 'access_denied'],
  ])(
    'maps authentication and authorization without internal detail',
    (error, code) => {
      const mapped = mapper.map(error);

      expect(mapped.code).toBe(code);
      expect(JSON.stringify(mapped)).not.toContain('unsafe');
    },
  );

  it.each([
    new LoginRateLimitExceededError(90.2),
    new RegistrationRateLimitExceededError(90.2),
    new EmailVerificationResendRateLimitExceededError(90.2),
    new PasswordResetRateLimitExceededError(90.2),
  ])(
    'maps a domain rate limit to 429 with a safe rounded retry interval',
    (error) => {
      expect(mapper.map(error)).toMatchObject({
        status: 429,
        code: 'rate_limit_exceeded',
        retryAfterSeconds: 91,
      });
    },
  );

  it.each([
    [new BadRequestException('unsafe'), 400, 'invalid_request'],
    [new NotFoundException('unsafe'), 404, 'resource_not_found'],
    [new ConflictException('unsafe'), 409, 'state_conflict'],
    [
      new UnsupportedMediaTypeException('unsafe'),
      415,
      'unsupported_media_type',
    ],
    [new UnprocessableEntityException('unsafe'), 422, 'validation_error'],
    [
      new HttpException('unsafe', HttpStatus.TOO_MANY_REQUESTS),
      429,
      'rate_limit_exceeded',
    ],
  ])(
    'maps framework HTTP exceptions by status using a safe public contract',
    (error, status, code) => {
      const mapped = mapper.map(error);

      expect(mapped).toMatchObject({ status, code });
      expect(JSON.stringify(mapped)).not.toContain('unsafe');
    },
  );

  it('maps persistence conflicts without exposing constrained fields', () => {
    const mapped = mapper.map(
      new UniqueConstraintViolationError(['email', 'sensitive_column']),
    );

    expect(mapped).toMatchObject({ status: 409, code: 'state_conflict' });
    expect(JSON.stringify(mapped)).not.toContain('sensitive_column');
  });

  it('maps unexpected and unknown HTTP failures to one generic internal problem', () => {
    const failures = [
      new Error('password=secret token=raw sql=users'),
      new HttpException('private upstream response', 418),
    ];

    for (const failure of failures) {
      const serialized = JSON.stringify(mapper.map(failure));
      expect(serialized).toContain('internal_error');
      expect(serialized).not.toContain(failure.message);
    }
  });
});
