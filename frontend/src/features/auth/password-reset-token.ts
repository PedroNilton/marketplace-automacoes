export function readPasswordResetToken(search: string): string | null {
  const token = new URLSearchParams(search).get('token')?.trim();

  if (!token || token.length > 512) {
    return null;
  }

  return token;
}

export function safePasswordResetPathname(pathname: string): string {
  return pathname === '/redefinir-senha' ? pathname : '/redefinir-senha';
}
