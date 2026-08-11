import { argon2id, hash, verify } from 'argon2';
import type { Environment } from '../../../config/environment';
import { PasswordHasher } from '../../application/ports/password-hasher';

const MINIMUM_MEMORY_COST_KIB = 19_456;
const MINIMUM_TIME_COST = 2;
const MINIMUM_PARALLELISM = 1;

export interface Argon2idPasswordHasherOptions {
  memoryCostKiB: number;
  timeCost: number;
  parallelism: number;
}

type Argon2Environment = Pick<
  Environment,
  'ARGON2_MEMORY_KIB' | 'ARGON2_ITERATIONS' | 'ARGON2_PARALLELISM'
>;

export class Argon2idPasswordHasher extends PasswordHasher {
  private readonly options: Argon2idPasswordHasherOptions;

  constructor(options: Argon2idPasswordHasherOptions) {
    super();
    assertSecureOptions(options);
    this.options = Object.freeze({ ...options });
  }

  static fromEnvironment(
    environment: Argon2Environment,
  ): Argon2idPasswordHasher {
    return new Argon2idPasswordHasher({
      memoryCostKiB: environment.ARGON2_MEMORY_KIB,
      timeCost: environment.ARGON2_ITERATIONS,
      parallelism: environment.ARGON2_PARALLELISM,
    });
  }

  hash(password: string): Promise<string> {
    return hash(password, {
      type: argon2id,
      memoryCost: this.options.memoryCostKiB,
      timeCost: this.options.timeCost,
      parallelism: this.options.parallelism,
    });
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}

function assertSecureOptions(options: Argon2idPasswordHasherOptions): void {
  if (
    !Number.isInteger(options.memoryCostKiB) ||
    options.memoryCostKiB < MINIMUM_MEMORY_COST_KIB ||
    !Number.isInteger(options.timeCost) ||
    options.timeCost < MINIMUM_TIME_COST ||
    !Number.isInteger(options.parallelism) ||
    options.parallelism < MINIMUM_PARALLELISM
  ) {
    throw new Error('Argon2id parameters do not meet the security baseline.');
  }
}
