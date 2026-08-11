import type { PasswordBlocklist } from '../../domain/password-blocklist';

const COMMON_PASSWORDS = [
  '123456789012345',
  'adminadminadmin',
  'changemechangeme',
  'correcthorsebatterystaple',
  'iloveyouiloveyou',
  'letmeinletmein',
  'marketplacemarketplace',
  'minhasenha12345',
  'passwordpassword',
  'qwertyuiopasdfg',
  'senha123456789',
] as const;

export class LocalPasswordBlocklist implements PasswordBlocklist {
  private readonly entries: ReadonlySet<string>;

  constructor(entries: Iterable<string> = COMMON_PASSWORDS) {
    this.entries = new Set(Array.from(entries, canonicalizeForComparison));
  }

  contains(password: string): boolean {
    return this.entries.has(canonicalizeForComparison(password));
  }
}

function canonicalizeForComparison(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}
