import { randomBytes } from 'node:crypto';
import { SecureTokenGenerator } from '../../application/ports/secure-token-generator';

const TOKEN_ENTROPY_BYTES = 32;

export class NodeSecureTokenGenerator extends SecureTokenGenerator {
  static readonly entropyBits = TOKEN_ENTROPY_BYTES * 8;

  generate(): string {
    return randomBytes(TOKEN_ENTROPY_BYTES).toString('base64url');
  }
}
