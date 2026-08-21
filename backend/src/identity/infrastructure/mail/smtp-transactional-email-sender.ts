import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { Environment } from '../../../config/environment';
import {
  TransactionalEmail,
  TransactionalEmailSender,
} from '../../application/ports/transactional-email-sender';

@Injectable()
export class SmtpTransactionalEmailSender extends TransactionalEmailSender {
  private readonly from: string;
  private readonly transporter: Transporter;

  constructor(config: ConfigService<Environment, true>) {
    super();
    this.from = config.get('SMTP_FROM', { infer: true });
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
    });
  }

  async send(message: TransactionalEmail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
