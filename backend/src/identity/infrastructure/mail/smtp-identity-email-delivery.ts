import { Injectable, Logger } from '@nestjs/common';
import {
  EmailVerificationDelivery,
  IdentityEmailDelivery,
  PasswordChangedDelivery,
  PasswordResetDelivery,
} from '../../application/ports/identity-email-delivery';
import { TransactionalEmailSender } from '../../application/ports/transactional-email-sender';
import { IdentityEmailTemplates } from './identity-email-templates';

@Injectable()
export class SmtpIdentityEmailDelivery extends IdentityEmailDelivery {
  private readonly logger = new Logger(SmtpIdentityEmailDelivery.name);

  constructor(
    private readonly templates: IdentityEmailTemplates,
    private readonly sender: TransactionalEmailSender,
  ) {
    super();
  }

  async sendEmailVerification(
    delivery: EmailVerificationDelivery,
  ): Promise<void> {
    await this.send('EMAIL_VERIFICATION', () =>
      this.templates.emailVerification(delivery),
    );
  }

  async sendPasswordReset(delivery: PasswordResetDelivery): Promise<void> {
    await this.send('PASSWORD_RESET', () =>
      this.templates.passwordReset(delivery),
    );
  }

  async sendPasswordChanged(delivery: PasswordChangedDelivery): Promise<void> {
    await this.send('PASSWORD_CHANGED', () =>
      this.templates.passwordChanged(delivery),
    );
  }

  private async send(
    event: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'PASSWORD_CHANGED',
    message: () => ReturnType<IdentityEmailTemplates['emailVerification']>,
  ): Promise<void> {
    try {
      await this.sender.send(message());
    } catch {
      this.logger.error(`identity_email_delivery_failed event=${event}`);
    }
  }
}
