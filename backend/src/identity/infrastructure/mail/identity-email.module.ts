import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../../config/application-config.module';
import { TransactionalEmailSender } from '../../application/ports/transactional-email-sender';
import { IdentityEmailDelivery } from '../../application/ports/identity-email-delivery';
import { IdentityEmailTemplates } from './identity-email-templates';
import { SmtpIdentityEmailDelivery } from './smtp-identity-email-delivery';
import { SmtpTransactionalEmailSender } from './smtp-transactional-email-sender';

@Module({
  imports: [ApplicationConfigModule],
  providers: [
    IdentityEmailTemplates,
    SmtpTransactionalEmailSender,
    SmtpIdentityEmailDelivery,
    {
      provide: TransactionalEmailSender,
      useExisting: SmtpTransactionalEmailSender,
    },
    {
      provide: IdentityEmailDelivery,
      useExisting: SmtpIdentityEmailDelivery,
    },
  ],
  exports: [
    IdentityEmailTemplates,
    TransactionalEmailSender,
    IdentityEmailDelivery,
  ],
})
export class IdentityEmailModule {}
