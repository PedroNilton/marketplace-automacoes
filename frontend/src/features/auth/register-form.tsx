'use client';

import { FormEvent, useRef, useState } from 'react';
import { createIdentityApiClient } from '@/lib/api/identity-api-client';
import { ApiProblemError } from '@/lib/api/problem-details';
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from './legal-versions';
import {
  hasRegisterFormErrors,
  RegisterFormErrors,
  RegisterFormField,
  RegisterFormValues,
  validateRegisterForm,
} from './register-form-validation';

const initialValues: RegisterFormValues = {
  displayName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  termsAccepted: false,
  privacyAccepted: false,
};

const fieldIds: Record<RegisterFormField, string> = {
  displayName: 'display-name',
  email: 'email',
  password: 'password',
  passwordConfirmation: 'password-confirmation',
  termsAccepted: 'terms-accepted',
  privacyAccepted: 'privacy-accepted',
};

export function RegisterForm() {
  const [values, setValues] = useState<RegisterFormValues>(initialValues);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const validationErrors = validateRegisterForm(values);
    if (hasRegisterFormErrors(validationErrors)) {
      setErrors(validationErrors);
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await createIdentityApiClient().register({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
      });

      setValues((current) => ({
        ...initialValues,
        displayName: current.displayName,
        email: current.email,
      }));
      setSuccessMessage(response.message);
    } catch (error) {
      const apiErrors = mapApiErrors(error);
      if (hasRegisterFormErrors(apiErrors)) {
        setErrors(apiErrors);
        requestAnimationFrame(() => errorSummaryRef.current?.focus());
      } else {
        setFormError(
          'Não foi possível concluir seu cadastro agora. Tente novamente.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateValue<Field extends RegisterFormField>(
    field: Field,
    value: RegisterFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  const errorMessages = Object.values(errors).filter(
    (message): message is string => Boolean(message),
  );

  return (
    <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
      <div
        aria-live="assertive"
        className={errorMessages.length === 0 ? 'sr-only' : undefined}
        ref={errorSummaryRef}
        tabIndex={-1}
      >
        {errorMessages.length > 0 ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            role="alert"
          >
            <p className="font-semibold">Revise os campos indicados.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errorMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {formError ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {formError}
        </div>
      ) : null}
      {successMessage ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          role="status"
        >
          {successMessage}
        </div>
      ) : null}

      <Field label="Nome" error={errors.displayName} id={fieldIds.displayName}>
        <input
          autoComplete="name"
          className={inputClassName(errors.displayName)}
          id={fieldIds.displayName}
          name="displayName"
          onChange={(event) => updateValue('displayName', event.target.value)}
          required
          type="text"
          value={values.displayName}
        />
      </Field>

      <Field label="E-mail" error={errors.email} id={fieldIds.email}>
        <input
          autoComplete="email"
          className={inputClassName(errors.email)}
          id={fieldIds.email}
          inputMode="email"
          name="email"
          onChange={(event) => updateValue('email', event.target.value)}
          required
          type="email"
          value={values.email}
        />
      </Field>

      <Field
        hint="Use pelo menos 15 caracteres. Espaços e caracteres especiais são aceitos."
        label="Senha"
        error={errors.password}
        id={fieldIds.password}
      >
        <input
          autoComplete="new-password"
          className={inputClassName(errors.password)}
          id={fieldIds.password}
          minLength={15}
          name="password"
          onChange={(event) => updateValue('password', event.target.value)}
          required
          type="password"
          value={values.password}
        />
      </Field>

      <Field
        label="Confirmar senha"
        error={errors.passwordConfirmation}
        id={fieldIds.passwordConfirmation}
      >
        <input
          autoComplete="new-password"
          className={inputClassName(errors.passwordConfirmation)}
          id={fieldIds.passwordConfirmation}
          name="passwordConfirmation"
          onChange={(event) =>
            updateValue('passwordConfirmation', event.target.value)
          }
          required
          type="password"
          value={values.passwordConfirmation}
        />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-900">
          Aceites necessários
        </legend>
        <CheckboxField
          checked={values.termsAccepted}
          error={errors.termsAccepted}
          id={fieldIds.termsAccepted}
          label={`Li e aceito os Termos de Uso (versão ${CURRENT_TERMS_VERSION}).`}
          onChange={(checked) => updateValue('termsAccepted', checked)}
        />
        <CheckboxField
          checked={values.privacyAccepted}
          error={errors.privacyAccepted}
          id={fieldIds.privacyAccepted}
          label={`Li e reconheço a Política de Privacidade (versão ${CURRENT_PRIVACY_VERSION}).`}
          onChange={(checked) => updateValue('privacyAccepted', checked)}
        />
      </fieldset>

      <button
        className="flex w-full justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Criando conta…' : 'Criar conta'}
      </button>
    </form>
  );
}

function Field({
  children,
  error,
  hint,
  id,
  label,
}: {
  readonly children: React.ReactNode;
  readonly error?: string;
  readonly hint?: string;
  readonly id: string;
  readonly label: string;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <label
        className="block text-sm font-semibold text-slate-900"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="mt-2">{cloneInput(children, error, describedBy)}</div>
      {hint ? (
        <p className="mt-2 text-sm text-slate-600" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-700" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CheckboxField({
  checked,
  error,
  id,
  label,
  onChange,
}: {
  readonly checked: boolean;
  readonly error?: string;
  readonly id: string;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <div>
      <label
        className="flex cursor-pointer items-start gap-3 text-sm text-slate-700"
        htmlFor={id}
      >
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={Boolean(error)}
          checked={checked}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
          id={id}
          name={id}
          onChange={(event) => onChange(event.target.checked)}
          required
          type="checkbox"
        />
        <span>{label}</span>
      </label>
      {error ? (
        <p className="mt-2 text-sm text-red-700" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function cloneInput(
  children: React.ReactNode,
  error: string | undefined,
  describedBy: string,
) {
  if (!isReactElement(children)) {
    return children;
  }

  return {
    ...children,
    props: {
      ...children.props,
      'aria-describedby': describedBy || undefined,
      'aria-invalid': Boolean(error),
    },
  };
}

function isReactElement(
  value: React.ReactNode,
): value is React.ReactElement<{ readonly props?: object }> {
  return typeof value === 'object' && value !== null && 'props' in value;
}

function inputClassName(error?: string): string {
  return [
    'w-full rounded-xl border bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition focus:ring-2 focus:ring-offset-1',
    error
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
      : 'border-slate-300 focus:border-blue-700 focus:ring-blue-700',
  ].join(' ');
}

function mapApiErrors(error: unknown): RegisterFormErrors {
  if (!(error instanceof ApiProblemError)) {
    return {};
  }

  return (error.problem.errors ?? []).reduce<RegisterFormErrors>(
    (result, fieldError) => {
      const field = apiFieldToFormField(fieldError.field);
      if (field) {
        result[field] = fieldError.message;
      }
      return result;
    },
    {},
  );
}

function apiFieldToFormField(field: string): RegisterFormField | null {
  if (field === 'termsVersion') {
    return 'termsAccepted';
  }
  if (field === 'privacyVersion') {
    return 'privacyAccepted';
  }
  if (field in fieldIds) {
    return field as RegisterFormField;
  }
  return null;
}
