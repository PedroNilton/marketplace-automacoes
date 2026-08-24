export interface LoginNavigationSession {
  readonly restricted: boolean;
  readonly returnTo: string;
}

export function readLoginReturnTo(search: string): string | undefined {
  const value = new URLSearchParams(search).get('returnTo');

  return value && isSafeInternalPath(value) ? value : undefined;
}

export function postLoginPath(session: LoginNavigationSession): string {
  if (session.restricted) {
    return '/verificar-email';
  }

  return isSafeInternalPath(session.returnTo) ? session.returnTo : '/';
}

function isSafeInternalPath(value: string): boolean {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !value.includes('\u0000') &&
    value.length <= 2_048
  );
}
