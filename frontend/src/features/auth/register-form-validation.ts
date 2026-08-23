export interface RegisterFormValues {
  readonly displayName: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirmation: string;
  readonly termsAccepted: boolean;
  readonly privacyAccepted: boolean;
}

export type RegisterFormField = keyof RegisterFormValues;

export type RegisterFormErrors = Partial<Record<RegisterFormField, string>>;

export function validateRegisterForm(
  values: RegisterFormValues,
): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!values.displayName.trim()) {
    errors.displayName = 'Informe seu nome.';
  }
  if (!values.email.trim()) {
    errors.email = 'Informe seu e-mail.';
  } else if (!isEmail(values.email)) {
    errors.email = 'Informe um e-mail válido.';
  }
  if (!values.password) {
    errors.password = 'Informe uma senha.';
  } else if (values.password.length < 15) {
    errors.password = 'Use pelo menos 15 caracteres na senha.';
  }
  if (!values.passwordConfirmation) {
    errors.passwordConfirmation = 'Confirme sua senha.';
  } else if (values.password !== values.passwordConfirmation) {
    errors.passwordConfirmation = 'As senhas não coincidem.';
  }
  if (!values.termsAccepted) {
    errors.termsAccepted = 'Aceite os termos de uso para continuar.';
  }
  if (!values.privacyAccepted) {
    errors.privacyAccepted =
      'Reconheça a política de privacidade para continuar.';
  }

  return errors;
}

export function hasRegisterFormErrors(errors: RegisterFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}
