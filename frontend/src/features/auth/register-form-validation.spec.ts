import {
  hasRegisterFormErrors,
  validateRegisterForm,
} from './register-form-validation';

describe('validateRegisterForm', () => {
  const validValues = {
    displayName: 'Mariana Souza',
    email: 'mariana@example.com',
    password: 'uma senha longa e segura',
    passwordConfirmation: 'uma senha longa e segura',
    termsAccepted: true,
    privacyAccepted: true,
  };

  it('accepts a complete registration input', () => {
    const errors = validateRegisterForm(validValues);

    expect(errors).toEqual({});
    expect(hasRegisterFormErrors(errors)).toBe(false);
  });

  it('returns errors associated with each missing field', () => {
    const errors = validateRegisterForm({
      displayName: ' ',
      email: 'invalid-email',
      password: 'short',
      passwordConfirmation: 'different',
      termsAccepted: false,
      privacyAccepted: false,
    });

    expect(errors).toEqual({
      displayName: 'Informe seu nome.',
      email: 'Informe um e-mail válido.',
      password: 'Use pelo menos 15 caracteres na senha.',
      passwordConfirmation: 'As senhas não coincidem.',
      termsAccepted: 'Aceite os termos de uso para continuar.',
      privacyAccepted: 'Reconheça a política de privacidade para continuar.',
    });
    expect(hasRegisterFormErrors(errors)).toBe(true);
  });
});
