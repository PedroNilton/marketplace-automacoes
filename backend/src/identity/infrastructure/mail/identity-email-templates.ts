import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment } from '../../../config/environment';
import { TransactionalEmail } from '../../application/ports/transactional-email-sender';

export interface VerificationEmailTemplateInput {
  readonly recipient: string;
  readonly displayName: string;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface PasswordResetEmailTemplateInput {
  readonly recipient: string;
  readonly displayName: string;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface PasswordChangedEmailTemplateInput {
  readonly recipient: string;
  readonly displayName: string;
}

@Injectable()
export class IdentityEmailTemplates {
  private readonly frontendOrigin: string;

  constructor(config: ConfigService<Environment, true>) {
    this.frontendOrigin = config.get('FRONTEND_ORIGIN', { infer: true });
  }

  emailVerification(input: VerificationEmailTemplateInput): TransactionalEmail {
    const link = this.link('/verificar-email', input.token);
    const expiration = formatExpiration(input.expiresAt);

    return message({
      to: input.recipient,
      subject: 'Confirme seu e-mail no Marketplace de Automações',
      text: [
        `Olá, ${input.displayName}.`,
        '',
        'Confirme seu e-mail para concluir o cadastro no Marketplace de Automações.',
        `Acesse: ${link}`,
        `Este link expira em ${expiration}.`,
        '',
        'Se você não solicitou este cadastro, ignore esta mensagem.',
      ].join('\n'),
      html: [
        `<p>Olá, ${escapeHtml(input.displayName)}.</p>`,
        '<p>Confirme seu e-mail para concluir o cadastro no Marketplace de Automações.</p>',
        `<p><a href="${escapeHtml(link)}">Confirmar e-mail</a></p>`,
        `<p>Este link expira em ${escapeHtml(expiration)}.</p>`,
        '<p>Se você não solicitou este cadastro, ignore esta mensagem.</p>',
      ].join(''),
    });
  }

  passwordReset(input: PasswordResetEmailTemplateInput): TransactionalEmail {
    const link = this.link('/redefinir-senha', input.token);
    const expiration = formatExpiration(input.expiresAt);

    return message({
      to: input.recipient,
      subject: 'Redefina sua senha no Marketplace de Automações',
      text: [
        `Olá, ${input.displayName}.`,
        '',
        'Recebemos uma solicitação para redefinir sua senha.',
        `Acesse: ${link}`,
        `Este link expira em ${expiration}.`,
        '',
        'Se você não solicitou esta redefinição, ignore esta mensagem.',
      ].join('\n'),
      html: [
        `<p>Olá, ${escapeHtml(input.displayName)}.</p>`,
        '<p>Recebemos uma solicitação para redefinir sua senha.</p>',
        `<p><a href="${escapeHtml(link)}">Redefinir senha</a></p>`,
        `<p>Este link expira em ${escapeHtml(expiration)}.</p>`,
        '<p>Se você não solicitou esta redefinição, ignore esta mensagem.</p>',
      ].join(''),
    });
  }

  passwordChanged(
    input: PasswordChangedEmailTemplateInput,
  ): TransactionalEmail {
    return message({
      to: input.recipient,
      subject: 'Sua senha foi alterada no Marketplace de Automações',
      text: [
        `Olá, ${input.displayName}.`,
        '',
        'Sua senha foi alterada com sucesso.',
        'Se você não realizou esta alteração, solicite uma nova redefinição de senha.',
      ].join('\n'),
      html: [
        `<p>Olá, ${escapeHtml(input.displayName)}.</p>`,
        '<p>Sua senha foi alterada com sucesso.</p>',
        '<p>Se você não realizou esta alteração, solicite uma nova redefinição de senha.</p>',
      ].join(''),
    });
  }

  private link(path: string, token: string): string {
    const link = new URL(path, this.frontendOrigin);
    link.searchParams.set('token', token);

    return link.toString();
  }
}

function message(value: TransactionalEmail): TransactionalEmail {
  return value;
}

function formatExpiration(value: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };

    return entities[character] ?? character;
  });
}
