'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { createIdentityApiClient } from '@/lib/api/identity-api-client';
import { ApiProblemError } from '@/lib/api/problem-details';
import {
  readPasswordResetToken,
  safePasswordResetPathname,
} from './password-reset-token';

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setMessage(null);

    if (!isEmail(email)) {
      setEmailError('Informe um e-mail válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createIdentityApiClient().requestPasswordReset(
        email.trim(),
      );
      setMessage(response.message);
    } catch (error) {
      setEmailError(
        fieldErrorFor(error, 'email') ??
          'Não foi possível solicitar a recuperação agora.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" noValidate onSubmit={submit}>
      <div>
        <label
          className="block text-sm font-semibold text-slate-900"
          htmlFor="recovery-email"
        >
          E-mail da sua conta
        </label>
        <input
          aria-describedby={emailError ? 'recovery-email-error' : undefined}
          aria-invalid={Boolean(emailError)}
          autoComplete="email"
          className={inputClassName(emailError)}
          id="recovery-email"
          inputMode="email"
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(null);
          }}
          required
          type="email"
          value={email}
        />
        {emailError ? (
          <FieldError id="recovery-email-error" message={emailError} />
        ) : null}
      </div>
      {message ? <SuccessMessage message={message} /> : null}
      <button
        className="flex w-full justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Enviando…' : 'Enviar link de recuperação'}
      </button>
    </form>
  );
}

export function PasswordResetForm() {
  const tokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'invalid' | 'success'
  >('loading');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = readPasswordResetToken(window.location.search);
    window.history.replaceState(
      null,
      '',
      safePasswordResetPathname(window.location.pathname),
    );
    tokenRef.current = token;

    const readyTimer = window.setTimeout(() => {
      setStatus(token ? 'ready' : 'invalid');
    }, 0);

    return () => {
      window.clearTimeout(readyTimer);
      tokenRef.current = null;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const validation = validatePasswords(password, passwordConfirmation);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

    const token = tokenRef.current;
    if (!token) {
      setStatus('invalid');
      return;
    }

    setIsSubmitting(true);
    try {
      await createIdentityApiClient().confirmPasswordReset({
        token,
        password,
        passwordConfirmation,
      });
      tokenRef.current = null;
      setPassword('');
      setPasswordConfirmation('');
      setStatus('success');
    } catch (error) {
      setPassword('');
      setPasswordConfirmation('');
      if (isInvalidOrExpiredToken(error)) {
        tokenRef.current = null;
        setStatus('invalid');
      } else {
        const apiErrors = passwordErrorsFor(error);
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
        } else {
          setFormError(
            'Não foi possível redefinir sua senha agora. Tente novamente.',
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <StatusPanel
        description="Estamos preparando a redefinição de senha."
        title="Aguarde um instante"
      />
    );
  }
  if (status === 'invalid') {
    return <InvalidTokenPanel />;
  }
  if (status === 'success') {
    return (
      <StatusPanel
        action={<LoginLink />}
        description="Sua senha foi alterada. Por segurança, entre novamente na sua conta."
        title="Senha redefinida"
      />
    );
  }

  return (
    <form className="mt-8 space-y-5" noValidate onSubmit={submit}>
      {formError ? <ErrorMessage message={formError} /> : null}
      <PasswordField
        error={errors.password}
        id="new-password"
        label="Nova senha"
        onChange={(value) => {
          setPassword(value);
          setErrors((current) => ({ ...current, password: undefined }));
        }}
        value={password}
      />
      <PasswordField
        error={errors.passwordConfirmation}
        id="new-password-confirmation"
        label="Confirmar nova senha"
        onChange={(value) => {
          setPasswordConfirmation(value);
          setErrors((current) => ({
            ...current,
            passwordConfirmation: undefined,
          }));
        }}
        value={passwordConfirmation}
      />
      <button
        className="flex w-full justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Redefinindo…' : 'Redefinir senha'}
      </button>
    </form>
  );
}

function PasswordField({
  error,
  id,
  label,
  onChange,
  value,
}: {
  readonly error?: string;
  readonly id: string;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  return (
    <div>
      <label
        className="block text-sm font-semibold text-slate-900"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        autoComplete="new-password"
        className={inputClassName(error ?? null)}
        id={id}
        minLength={15}
        name={id}
        onChange={(event) => onChange(event.target.value)}
        required
        type="password"
        value={value}
      />
      {error ? <FieldError id={`${id}-error`} message={error} /> : null}
    </div>
  );
}

function InvalidTokenPanel() {
  return (
    <StatusPanel
      action={
        <Link
          className="inline-flex rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          href="/recuperar-senha"
        >
          Solicitar novo link
        </Link>
      }
      description="O link pode ter expirado, já ter sido utilizado ou estar incompleto. Solicite um novo link para continuar."
      title="Este link não está mais disponível"
    />
  );
}

function StatusPanel({
  action,
  description,
  title,
}: {
  readonly action?: React.ReactNode;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <section aria-live="polite" className="mt-8" role="status">
      <h2 className="text-2xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-3 text-slate-600">{description}</p>
      {action ? <div className="mt-8">{action}</div> : null}
    </section>
  );
}

function LoginLink() {
  return (
    <Link
      className="inline-flex rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
      href="/entrar"
    >
      Ir para o login
    </Link>
  );
}

function FieldError({
  id,
  message,
}: {
  readonly id: string;
  readonly message: string;
}) {
  return (
    <p className="mt-2 text-sm text-red-700" id={id}>
      {message}
    </p>
  );
}

function ErrorMessage({ message }: { readonly message: string }) {
  return (
    <p
      className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      role="alert"
    >
      {message}
    </p>
  );
}

function SuccessMessage({ message }: { readonly message: string }) {
  return (
    <p
      className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
      role="status"
    >
      {message}
    </p>
  );
}

function inputClassName(error: string | null): string {
  return [
    'mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition focus:ring-2 focus:ring-offset-1',
    error
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
      : 'border-slate-300 focus:border-blue-700 focus:ring-blue-700',
  ].join(' ');
}

function validatePasswords(
  password: string,
  passwordConfirmation: string,
): PasswordErrors {
  const errors: PasswordErrors = {};
  if (!password) {
    errors.password = 'Informe uma nova senha.';
  } else if (password.length < 15) {
    errors.password = 'Use pelo menos 15 caracteres na senha.';
  }
  if (!passwordConfirmation) {
    errors.passwordConfirmation = 'Confirme sua nova senha.';
  } else if (password !== passwordConfirmation) {
    errors.passwordConfirmation = 'As senhas não coincidem.';
  }
  return errors;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim());
}

function isInvalidOrExpiredToken(error: unknown): boolean {
  return (
    error instanceof ApiProblemError &&
    error.problem.code === 'invalid_or_expired_token'
  );
}

function fieldErrorFor(error: unknown, field: string): string | null {
  if (!(error instanceof ApiProblemError)) {
    return null;
  }
  return (
    error.problem.errors?.find((item) => item.field === field)?.message ?? null
  );
}

function passwordErrorsFor(error: unknown): PasswordErrors {
  if (!(error instanceof ApiProblemError)) {
    return {};
  }
  return (error.problem.errors ?? []).reduce<PasswordErrors>((result, item) => {
    if (item.field === 'password' || item.field === 'passwordConfirmation') {
      result[item.field] = item.message;
    }
    return result;
  }, {});
}

type PasswordErrors = Partial<
  Record<'password' | 'passwordConfirmation', string>
>;
