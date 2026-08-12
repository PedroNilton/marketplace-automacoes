const SAFE_AUTHENTICATED_FALLBACK = '/conta';
const MAXIMUM_RETURN_PATH_LENGTH = 2_048;
const INTERNAL_ORIGIN = 'https://internal.invalid';
const AMBIGUOUS_ENCODED_CHARACTER_PATTERN =
  /%(?:00|0[1-9a-f]|1[0-9a-f]|2e|2f|5c|7f)/i;
const DOT_SEGMENT_PATTERN = /(?:^|\/)\.{1,2}(?:\/|$)/;
const FORBIDDEN_PATH_PREFIXES = [
  '/_next',
  '/api',
  '/entrar',
  '/cadastro',
  '/verificar-email',
  '/recuperar-senha',
  '/redefinir-senha',
  '/acesso-indisponivel',
] as const;

export class InternalReturnPath {
  static readonly fallback = SAFE_AUTHENTICATED_FALLBACK;

  static resolve(candidate: string | null | undefined): string {
    if (!InternalReturnPath.isAllowed(candidate)) {
      return SAFE_AUTHENTICATED_FALLBACK;
    }

    return candidate;
  }

  private static isAllowed(
    candidate: string | null | undefined,
  ): candidate is string {
    const rawPath = candidate?.split(/[?#]/, 1)[0];

    if (
      candidate === null ||
      candidate === undefined ||
      candidate.length === 0 ||
      candidate.length > MAXIMUM_RETURN_PATH_LENGTH ||
      candidate !== candidate.trim() ||
      !candidate.startsWith('/') ||
      candidate.startsWith('//') ||
      candidate.includes('\\') ||
      InternalReturnPath.hasControlCharacter(candidate) ||
      AMBIGUOUS_ENCODED_CHARACTER_PATTERN.test(candidate) ||
      (rawPath !== undefined && DOT_SEGMENT_PATTERN.test(rawPath))
    ) {
      return false;
    }

    try {
      const url = new URL(candidate, INTERNAL_ORIGIN);
      const decodedPath = decodeURIComponent(url.pathname);

      return (
        url.origin === INTERNAL_ORIGIN &&
        !decodedPath.includes('\\') &&
        !decodedPath.startsWith('//') &&
        !DOT_SEGMENT_PATTERN.test(decodedPath) &&
        !InternalReturnPath.hasForbiddenPrefix(decodedPath)
      );
    } catch {
      return false;
    }
  }

  private static hasForbiddenPrefix(path: string): boolean {
    return FORBIDDEN_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }

  private static hasControlCharacter(value: string): boolean {
    return Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0);

      return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
    });
  }
}
