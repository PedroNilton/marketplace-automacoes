/* eslint-disable @typescript-eslint/unbound-method */
import { Logger } from '@nestjs/common';
import { TransactionalEmailSender } from '../../application/ports/transactional-email-sender';
import { IdentityEmailTemplates } from './identity-email-templates';
import { SmtpIdentityEmailDelivery } from './smtp-identity-email-delivery';

describe('SmtpIdentityEmailDelivery', () => {
  const email = {
    to: 'mariana@example.com',
    subject: 'Assunto de teste',
    text: 'Mensagem de teste',
  };
  let templates: jest.Mocked<IdentityEmailTemplates>;
  let sender: jest.Mocked<TransactionalEmailSender>;
  let loggerError: jest.SpiedFunction<Logger['error']>;

  beforeEach(() => {
    templates = {
      emailVerification: jest.fn(() => email),
      passwordReset: jest.fn(() => email),
      passwordChanged: jest.fn(() => email),
    } as unknown as jest.Mocked<IdentityEmailTemplates>;
    sender = { send: jest.fn().mockResolvedValue(undefined) };
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerError.mockRestore();
  });

  it('renders and sends each transactional message through the port', async () => {
    const delivery = new SmtpIdentityEmailDelivery(templates, sender);
    const verification = {
      recipient: 'mariana@example.com',
      displayName: 'Mariana',
      token: 'raw-token',
      expiresAt: new Date('2026-08-22T12:00:00.000Z'),
    };

    await delivery.sendEmailVerification(verification);
    await delivery.sendPasswordReset(verification);
    await delivery.sendPasswordChanged({
      recipient: verification.recipient,
      displayName: verification.displayName,
    });

    expect(templates.emailVerification).toHaveBeenCalledWith(verification);
    expect(templates.passwordReset).toHaveBeenCalledWith(verification);
    expect(templates.passwordChanged).toHaveBeenCalledWith({
      recipient: verification.recipient,
      displayName: verification.displayName,
    });
    expect(sender.send).toHaveBeenCalledTimes(3);
  });

  it('keeps delivery failures observable without propagating SMTP details', async () => {
    sender.send.mockRejectedValue(new Error('smtp unavailable raw-token'));
    const delivery = new SmtpIdentityEmailDelivery(templates, sender);

    await expect(
      delivery.sendEmailVerification({
        recipient: 'mariana@example.com',
        displayName: 'Mariana',
        token: 'raw-token',
        expiresAt: new Date('2026-08-22T12:00:00.000Z'),
      }),
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledWith(
      'identity_email_delivery_failed event=EMAIL_VERIFICATION',
    );
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain('raw-token');
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain(
      'mariana@example.com',
    );
  });
});
