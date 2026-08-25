export type AccessUnavailableReason =
  | 'verification-required'
  | 'session-expired'
  | 'account-unavailable'
  | 'access-denied';

export interface AccessUnavailableContent {
  readonly actionHref: string;
  readonly actionLabel: string;
  readonly description: string;
  readonly title: string;
}

const content: Record<AccessUnavailableReason, AccessUnavailableContent> = {
  'verification-required': {
    title: 'Confirme seu e-mail para continuar',
    description:
      'Algumas ações só ficam disponíveis depois da confirmação do endereço de e-mail.',
    actionHref: '/verificar-email',
    actionLabel: 'Verificar e-mail',
  },
  'session-expired': {
    title: 'Sua sessão foi encerrada',
    description: 'Entre novamente para continuar com segurança.',
    actionHref: '/entrar',
    actionLabel: 'Entrar novamente',
  },
  'account-unavailable': {
    title: 'Esta conta não está disponível',
    description:
      'Não foi possível disponibilizar o acesso a esta conta no momento. Tente entrar novamente mais tarde.',
    actionHref: '/entrar',
    actionLabel: 'Voltar ao login',
  },
  'access-denied': {
    title: 'Acesso não disponível',
    description: 'Você não pode realizar esta ação com o acesso atual.',
    actionHref: '/',
    actionLabel: 'Ir para o início',
  },
};

export function readAccessUnavailableReason(
  value: string | string[] | undefined,
): AccessUnavailableReason {
  if (typeof value === 'string' && value in content) {
    return value as AccessUnavailableReason;
  }

  return 'access-denied';
}

export function accessUnavailableContent(
  reason: AccessUnavailableReason,
): AccessUnavailableContent {
  return content[reason];
}
