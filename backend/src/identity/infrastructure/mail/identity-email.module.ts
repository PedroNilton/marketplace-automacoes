import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../../config/application-config.module';
import { TransactionalEmailSender } from '../../application/ports/transactional-email-sender';
import { SmtpTransactionalEmailSender } from './smtp-transactional-email-sender';

@Module({
  imports: [ApplicationConfigModule],
  providers: [
    SmtpTransactionalEmailSender,
    {
      provide: TransactionalEmailSender,
      useExisting: SmtpTransactionalEmailSender,
    },
  ],
  exports: [TransactionalEmailSender],
})
export class IdentityEmailModule {}
