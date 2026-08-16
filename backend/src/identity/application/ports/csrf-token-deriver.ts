export abstract class CsrfTokenDeriver {
  abstract derive(sessionToken: string): string;
}
