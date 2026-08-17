const SESSION_TOKEN_PATTERN = /^[A-Za-z\d_-]{43}$/;

export function parseSessionToken(
  value: string | null | undefined,
): string | null {
  return value && SESSION_TOKEN_PATTERN.test(value) ? value : null;
}
