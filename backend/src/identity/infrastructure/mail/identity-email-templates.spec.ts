import { ConfigService } from '@nestjs/config';
import { Environment } from '../../../config/environment';
import { IdentityEmailTemplates } from './identity-email-templates';

const FRONTEND_ORIGIN = 'https://app.marketplace.example';
const EXPIRATION = new Date('2026-08-21T15:30:00.000Z');
const TOKEN = 'raw-token-with-?&-characters';

describe('IdentityEmailTemplates', () => {
  const config = {
    get: jest.fn(() => FRONTEND_ORIGIN),
  } as unknown as ConfigService<Environment, true>;
  const templates = new IdentityEmailTemplates(config);

  it('creates a verification email from the configured frontend origin', () => {
    const email = templates.emailVerification({
      recipient: 'ana@example.com',
      displayName: 'Ana <Souza>',
      token: TOKEN,
      expiresAt: EXPIRATION,
    });

    expect(email).toMatchObject({
      to: 'ana@example.com',
      subject: 'Confirme seu e-mail no Marketplace de Automações',
    });
    expect(email.text).toContain(
      'https://app.marketplace.example/verificar-email?token=raw-token-with-%3F%26-characters',
    );
    expect(email.text).toContain('21 de ago. de 2026, 15:30');
    expect(email.html).toContain('Ana &lt;Souza&gt;');
    expect(email.html).toContain('Confirmar e-mail');
  });

  it('creates a password reset email without relying on a request host', () => {
    const email = templates.passwordReset({
      recipient: 'ana@example.com',
      displayName: 'Ana Souza',
      token: TOKEN,
      expiresAt: EXPIRATION,
    });

    expect(email.subject).toBe(
      'Redefina sua senha no Marketplace de Automações',
    );
    expect(email.text).toContain(
      'https://app.marketplace.example/redefinir-senha?token=raw-token-with-%3F%26-characters',
    );
    expect(email.html).toContain('Redefinir senha');
  });

  it('creates a password changed notice without a password or reset token', () => {
    const email = templates.passwordChanged({
      recipient: 'ana@example.com',
      displayName: 'Ana Souza',
    });

    expect(email.subject).toBe(
      'Sua senha foi alterada no Marketplace de Automações',
    );
    expect(email.text).not.toContain(TOKEN);
    expect(email.html).not.toContain(TOKEN);
    expect(JSON.stringify(email)).not.toContain('senha-secreta');
  });

  it('does not log a token while producing an email link', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    try {
      templates.emailVerification({
        recipient: 'ana@example.com',
        displayName: 'Ana Souza',
        token: TOKEN,
        expiresAt: EXPIRATION,
      });

      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
