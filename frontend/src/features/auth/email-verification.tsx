'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createIdentityApiClient } from '@/lib/api/identity-api-client';
import { ApiProblemError } from '@/lib/api/problem-details';
import {
  readEmailVerificationToken,
  safeVerificationPathname,
} from './email-verification-token';

type ConfirmationStatus =
  'starting' | 'confirming' | 'verified' | 'invalid' | 'unavailable';

export function EmailVerification() {
  const client = useMemo(() => createIdentityApiClient(), []);
  const [status, setStatus] = useState<ConfirmationStatus>('starting');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const token = readEmailVerificationToken(window.location.search);
    window.history.replaceState(
      null,
      '',
      safeVerificationPathname(window.location.pathname),
    );

    const confirmationTimer = window.setTimeout(() => {
      if (!token) {
        setStatus('invalid');
        return;
      }

      setStatus('confirming');
      void confirm(token);
    }, 0);

    return () => window.clearTimeout(confirmationTimer);
  }, [client]);

  async function confirm(token: string) {
    try {
      await client.confirmEmail(token);
      setStatus('verified');
    } catch (error) {
      setStatus(isInvalidOrExpiredToken(error) ? 'invalid' : 'unavailable');
    }
  }

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setResendMessage(null);

    if (!isEmail(email)) {
      setEmailError('Informe um e-mail válido para solicitar um novo link.');
      return;
    }

    setIsResending(true);
    try {
      const response = await client.resendEmailVerification(email.trim());
      setResendMessage(response.message);
    } catch (error) {
      const message = fieldErrorFor(error, 'email');
      setEmailError(
        message ?? 'Não foi possível solicitar um novo link agora.',
      );
    } finally {
      setIsResending(false);
    }
  }

  if (status === 'verified') {
    return <VerifiedState />;
  }

  if (status === 'confirming' || status === 'starting') {
    return (
      <StatusPanel
        description="Estamos confirmando seu endereço de e-mail."
        title="Confirmando e-mail"
      />
    );
  }

  return (
    <section aria-labelledby="verification-title" className="w-full max-w-lg">
      <h1
        className="text-3xl font-bold tracking-tight text-slate-950"
        id="verification-title"
      >
        {status === 'invalid'
          ? 'O link não está mais disponível'
          : 'Não foi possível confirmar seu e-mail'}
      </h1>
      <p className="mt-3 text-slate-600">
        {status === 'invalid'
          ? 'Ele pode ter expirado, já ter sido utilizado ou estar incompleto. Solicite um novo link para continuar.'
          : 'Tente novamente em alguns instantes ou solicite um novo link de verificação.'}
      </p>
      <ResendForm
        email={email}
        emailError={emailError}
        isResending={isResending}
        message={resendMessage}
        onChange={setEmail}
        onSubmit={resend}
      />
    </section>
  );
}

function VerifiedState() {
  return (
    <StatusPanel
      action={
        <Link
          className="inline-flex rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          href="/entrar"
        >
          Entrar na plataforma
        </Link>
      }
      description="Seu endereço foi confirmado. Agora você já pode entrar na plataforma."
      title="E-mail confirmado"
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
    <section aria-live="polite" className="w-full max-w-lg" role="status">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        {title}
      </h1>
      <p className="mt-3 text-slate-600">{description}</p>
      {action ? <div className="mt-8">{action}</div> : null}
    </section>
  );
}

function ResendForm({
  email,
  emailError,
  isResending,
  message,
  onChange,
  onSubmit,
}: {
  readonly email: string;
  readonly emailError: string | null;
  readonly isResending: boolean;
  readonly message: string | null;
  readonly onChange: (value: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5"
      noValidate
      onSubmit={onSubmit}
    >
      <div>
        <label
          className="block text-sm font-semibold text-slate-900"
          htmlFor="resend-email"
        >
          E-mail da sua conta
        </label>
        <input
          aria-describedby={emailError ? 'resend-email-error' : undefined}
          aria-invalid={Boolean(emailError)}
          autoComplete="email"
          className={inputClassName(emailError)}
          id="resend-email"
          inputMode="email"
          name="email"
          onChange={(event) => onChange(event.target.value)}
          required
          type="email"
          value={email}
        />
        {emailError ? (
          <p className="mt-2 text-sm text-red-700" id="resend-email-error">
            {emailError}
          </p>
        ) : null}
      </div>
      {message ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          role="status"
        >
          {message}
        </p>
      ) : null}
      <button
        className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isResending}
        type="submit"
      >
        {isResending ? 'Enviando…' : 'Enviar novo link'}
      </button>
    </form>
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
