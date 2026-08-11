import { createHash, timingSafeEqual } from 'node:crypto';
import { TokenDigester } from '../../application/ports/token-digester';

const SHA_256_DIGEST_PATTERN = /^[a-f\d]{64}$/i;
const SHA_256_DIGEST_BYTES = 32;

export class Sha256TokenDigester extends TokenDigester {
  digest(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  matches(token: string, expectedDigest: string): boolean {
    const actual = Buffer.from(this.digest(token), 'hex');
    const hasValidFormat = SHA_256_DIGEST_PATTERN.test(expectedDigest);
    const expected = hasValidFormat
      ? Buffer.from(expectedDigest, 'hex')
      : Buffer.alloc(SHA_256_DIGEST_BYTES);
    const matches = timingSafeEqual(actual, expected);

    return hasValidFormat && matches;
  }
}
