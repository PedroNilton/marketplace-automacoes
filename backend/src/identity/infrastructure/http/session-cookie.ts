export function readSessionCookie(
  cookieHeader: string | undefined,
  cookieName: string,
): string | null {
  if (!cookieHeader || cookieName.length === 0) {
    return null;
  }

  const values = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${cookieName}=`))
    .map((part) => part.slice(cookieName.length + 1));

  if (values.length !== 1 || values[0].length === 0) {
    return null;
  }

  try {
    return decodeURIComponent(values[0]);
  } catch {
    return null;
  }
}
