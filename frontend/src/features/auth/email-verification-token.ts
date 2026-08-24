export function readEmailVerificationToken(search: string): string | null {
  const token = new URLSearchParams(search).get('token')?.trim();

  if (!token || token.length > 512) {
    return null;
  }

  return token;
}

export function safeVerificationPathname(pathname: string): string {
  return pathname === '/verificar-email' ? pathname : '/verificar-email';
}
