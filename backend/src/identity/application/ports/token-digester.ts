export abstract class TokenDigester {
  abstract digest(token: string): string;

  abstract matches(token: string, expectedDigest: string): boolean;
}
