'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useState } from 'react';
import { createIdentityApiClient } from '@/lib/api/identity-api-client';
import { ApiProblemError } from '@/lib/api/problem-details';
import { useAuth } from './auth-provider';
import { postLoginPath, readLoginReturnTo } from './login-navigation';

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      const validation = validate(email, password);
      setEmailError(validation.email);
      setPasswordError(validation.password);
      if (validation.email || validation.password) {
        return;
      }

      setIsSubmitting(true);
      try {
        const returnTo = readLoginReturnTo(window.location.search);
        const result = await createIdentityApiClient().login({
          email: email.trim(),
          password,
          returnTo,
        });

        setPassword('');
        await refresh();
        router.replace(postLoginPath(result.session));
      } catch (error) {
        setPassword('');
        setFormError(loginErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, refresh, router],
  );

  return (
    <form className="mt-8 space-y-5" noValidate onSubmit={submit}>
      {formError ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {formError}
        </p>
      ) : null}
      <div>
        <label
          className="block text-sm font-semibold text-slate-900"
          htmlFor="login-email"
        >
          E-mail
        </label>
        <input
          aria-describedby={emailError ? 'login-email-error' : undefined}
          aria-invalid={Boolean(emailError)}
          autoComplete="email"
          className={inputClassName(emailError)}
          id="login-email"
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
          <FieldError id="login-email-error" message={emailError} />
        ) : null}
      </div>
      <div>
        <label
          className="block text-sm font-semibold text-slate-900"
          htmlFor="login-password"
        >
          Senha
        </label>
        <input
          aria-describedby={passwordError ? 'login-password-error' : undefined}
          aria-invalid={Boolean(passwordError)}
          autoComplete="current-password"
          className={inputClassName(passwordError)}
          id="login-password"
          name="password"
          onChange={(event) => {
            setPassword(event.target.value);
            setPasswordError(null);
          }}
          required
          type="password"
          value={password}
        />
        {passwordError ? (
          <FieldError id="login-password-error" message={passwordError} />
        ) : null}
      </div>
      <div className="flex justify-end">
        <Link
          className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          href="/recuperar-senha"
        >
          Esqueci minha senha
        </Link>
      </div>
      <button
        className="flex w-full justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
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

function inputClassName(error: string | null): string {
  return [
    'mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition focus:ring-2 focus:ring-offset-1',
    error
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
      : 'border-slate-300 focus:border-blue-700 focus:ring-blue-700',
  ].join(' ');
}

function validate(
  email: string,
  password: string,
): {
  readonly email: string | null;
  readonly password: string | null;
} {
  return {
    email: isEmail(email) ? null : 'Informe um e-mail válido.',
    password: password ? null : 'Informe sua senha.',
  };
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim());
}

function loginErrorMessage(error: unknown): string {
  if (
    error instanceof ApiProblemError &&
    error.problem.code === 'account_unavailable'
  ) {
    return 'Sua conta não está disponível para acesso no momento.';
  }

  return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
}
