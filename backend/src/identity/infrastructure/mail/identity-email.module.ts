import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../../config/application-config.module';
import { TransactionalEmailSender } from '../../application/ports/transactional-email-sender';
import { IdentityEmailTemplates } from './identity-email-templates';
import { SmtpTransactionalEmailSender } from './smtp-transactional-email-sender';

@Module({
  imports: [ApplicationConfigModule],
  providers: [
    IdentityEmailTemplates,
    SmtpTransactionalEmailSender,
    {
      provide: TransactionalEmailSender,
      useExisting: SmtpTransactionalEmailSender,
    },
  ],
  exports: [IdentityEmailTemplates, TransactionalEmailSender],
})
export class IdentityEmailModule {}
