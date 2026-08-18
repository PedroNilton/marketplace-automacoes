import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UniqueConstraintViolationError } from '../../../application/errors/unique-constraint-violation.error';
import { AccountUnavailableError } from '../../../identity/application/errors/account-unavailable.error';
import { AuthenticationRequiredError } from '../../../identity/application/errors/authentication-required.error';
import { EmailVerificationResendRateLimitExceededError } from '../../../identity/application/errors/email-verification-resend-rate-limit-exceeded.error';
import { InvalidLoginCredentialsError } from '../../../identity/application/errors/invalid-login-credentials.error';
import {
  InvalidRegistrationInputError,
  InvalidRegistrationInputReason,
} from '../../../identity/application/errors/invalid-registration-input.error';
import { LoginRateLimitExceededError } from '../../../identity/application/errors/login-rate-limit-exceeded.error';
import { PasswordResetRateLimitExceededError } from '../../../identity/application/errors/password-reset-rate-limit-exceeded.error';
import { RegistrationRateLimitExceededError } from '../../../identity/application/errors/registration-rate-limit-exceeded.error';
import {
  InvalidEmailError,
  InvalidEmailReason,
} from '../../../identity/domain/invalid-email.error';
import {
  InvalidPasswordError,
  InvalidPasswordReason,
} from '../../../identity/domain/invalid-password.error';
import { ProblemDescriptor, ProblemFieldError } from './problem-details';
import { RequestValidationError } from '../validation/request-validation.error';

@Injectable()
export class ProblemDetailsMapper {
  map(exception: unknown): ProblemDescriptor {
    const fieldErrors = mapFieldErrors(exception);

    if (fieldErrors) {
      return descriptor(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'validation-error',
        'validation_error',
        'Não foi possível validar os dados.',
        { errors: fieldErrors },
      );
    }

    if (exception instanceof AuthenticationRequiredError) {
      return authenticationRequired();
    }

    if (exception instanceof InvalidLoginCredentialsError) {
      return descriptor(
        HttpStatus.UNAUTHORIZED,
        'invalid-credentials',
        'invalid_credentials',
        'As credenciais informadas não são válidas.',
      );
    }

    if (exception instanceof AccountUnavailableError) {
      return descriptor(
        HttpStatus.FORBIDDEN,
        'account-unavailable',
        'account_unavailable',
        'A conta não está disponível para esta operação.',
      );
    }

    const retryAfterSeconds = rateLimitRetryAfter(exception);
    if (retryAfterSeconds !== null) {
      return descriptor(
        HttpStatus.TOO_MANY_REQUESTS,
        'rate-limit-exceeded',
        'rate_limit_exceeded',
        'Muitas tentativas. Tente novamente mais tarde.',
        { retryAfterSeconds },
      );
    }

    if (exception instanceof UniqueConstraintViolationError) {
      return stateConflict();
    }

    if (exception instanceof HttpException) {
      return mapHttpStatus(exception.getStatus());
    }

    return descriptor(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'internal-error',
      'internal_error',
      'Não foi possível concluir a solicitação.',
    );
  }
}

function mapFieldErrors(
  exception: unknown,
): readonly ProblemFieldError[] | null {
  if (exception instanceof RequestValidationError) {
    return exception.issues;
  }

  if (exception instanceof InvalidEmailError) {
    return [emailError(exception.reason)];
  }

  if (exception instanceof InvalidPasswordError) {
    return [passwordError(exception.reason)];
  }

  if (exception instanceof InvalidRegistrationInputError) {
    return [registrationError(exception.reason)];
  }

  return null;
}

function emailError(reason: InvalidEmailReason): ProblemFieldError {
  const values: Record<InvalidEmailReason, ProblemFieldError> = {
    EMPTY: fieldError('email', 'email_required', 'Informe o e-mail.'),
    TOO_LONG: fieldError(
      'email',
      'email_too_long',
      'O e-mail informado é muito longo.',
    ),
    INVALID_FORMAT: fieldError(
      'email',
      'email_invalid_format',
      'Informe um e-mail válido.',
    ),
  };

  return values[reason];
}

function passwordError(reason: InvalidPasswordReason): ProblemFieldError {
  const values: Record<InvalidPasswordReason, ProblemFieldError> = {
    TOO_SHORT: fieldError(
      'password',
      'password_too_short',
      'Use pelo menos 15 caracteres.',
    ),
    TOO_LONG: fieldError(
      'password',
      'password_too_long',
      'Use no máximo 128 caracteres.',
    ),
    CONFIRMATION_MISMATCH: fieldError(
      'passwordConfirmation',
      'password_confirmation_mismatch',
      'A confirmação deve ser igual à senha.',
    ),
    BLOCKED: fieldError(
      'password',
      'password_blocked',
      'Escolha uma senha menos comum.',
    ),
  };

  return values[reason];
}

function registrationError(
  reason: InvalidRegistrationInputReason,
): ProblemFieldError {
  const values: Record<InvalidRegistrationInputReason, ProblemFieldError> = {
    DISPLAY_NAME_EMPTY: fieldError(
      'displayName',
      'display_name_required',
      'Informe o nome de exibição.',
    ),
    DISPLAY_NAME_TOO_LONG: fieldError(
      'displayName',
      'display_name_too_long',
      'Use no máximo 100 caracteres.',
    ),
    TERMS_NOT_ACCEPTED: fieldError(
      'termsVersion',
      'terms_not_accepted',
      'Aceite os termos de uso vigentes.',
    ),
    PRIVACY_NOT_ACCEPTED: fieldError(
      'privacyVersion',
      'privacy_not_accepted',
      'Reconheça a política de privacidade vigente.',
    ),
  };

  return values[reason];
}

function rateLimitRetryAfter(exception: unknown): number | null {
  if (
    exception instanceof LoginRateLimitExceededError ||
    exception instanceof RegistrationRateLimitExceededError ||
    exception instanceof EmailVerificationResendRateLimitExceededError ||
    exception instanceof PasswordResetRateLimitExceededError
  ) {
    return Math.max(1, Math.ceil(exception.retryAfterSeconds));
  }

  return null;
}

function mapHttpStatus(status: HttpStatus): ProblemDescriptor {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return descriptor(
        status,
        'invalid-request',
        'invalid_request',
        'Não foi possível processar a solicitação.',
      );
    case HttpStatus.UNAUTHORIZED:
      return authenticationRequired();
    case HttpStatus.FORBIDDEN:
      return descriptor(
        status,
        'access-denied',
        'access_denied',
        'Acesso não permitido.',
      );
    case HttpStatus.NOT_FOUND:
      return descriptor(
        status,
        'resource-not-found',
        'resource_not_found',
        'O recurso solicitado não foi encontrado.',
      );
    case HttpStatus.METHOD_NOT_ALLOWED:
      return descriptor(
        status,
        'method-not-allowed',
        'method_not_allowed',
        'O método não é permitido para este recurso.',
      );
    case HttpStatus.CONFLICT:
      return stateConflict();
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return descriptor(
        status,
        'payload-too-large',
        'payload_too_large',
        'O conteúdo enviado excede o limite permitido.',
      );
    case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
      return descriptor(
        status,
        'unsupported-media-type',
        'unsupported_media_type',
        'Envie o conteúdo no formato aceito pela operação.',
      );
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return descriptor(
        status,
        'validation-error',
        'validation_error',
        'Não foi possível validar os dados.',
      );
    case HttpStatus.TOO_MANY_REQUESTS:
      return descriptor(
        status,
        'rate-limit-exceeded',
        'rate_limit_exceeded',
        'Muitas tentativas. Tente novamente mais tarde.',
      );
    default:
      return descriptor(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'internal-error',
        'internal_error',
        'Não foi possível concluir a solicitação.',
      );
  }
}

function authenticationRequired(): ProblemDescriptor {
  return descriptor(
    HttpStatus.UNAUTHORIZED,
    'authentication-required',
    'authentication_required',
    'Autenticação necessária.',
  );
}

function stateConflict(): ProblemDescriptor {
  return descriptor(
    HttpStatus.CONFLICT,
    'state-conflict',
    'state_conflict',
    'O estado atual impede a operação.',
  );
}

function fieldError(
  field: string,
  code: string,
  message: string,
): ProblemFieldError {
  return { field, code, message };
}

function descriptor(
  status: number,
  typeSlug: string,
  code: string,
  title: string,
  extensions: Pick<ProblemDescriptor, 'errors' | 'retryAfterSeconds'> = {},
): ProblemDescriptor {
  return { status, typeSlug, code, title, ...extensions };
}
