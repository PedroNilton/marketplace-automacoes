import { Clock } from './ports/clock';
import { SessionRepository } from './ports/session-repository';
import { TokenDigester } from './ports/token-digester';
import { parseSessionToken } from './session-token';

export interface LogoutSessionInput {
  readonly sessionToken: string | null | undefined;
}

export interface LogoutSessionResult {
  readonly accepted: true;
  readonly revoked: boolean;
}

export interface LogoutSessionDependencies {
  readonly sessions: SessionRepository;
  readonly tokenDigester: TokenDigester;
  readonly clock: Clock;
}

export class LogoutSession {
  constructor(private readonly dependencies: LogoutSessionDependencies) {}

  async execute(input: LogoutSessionInput): Promise<LogoutSessionResult> {
    const sessionToken = parseSessionToken(input.sessionToken);

    if (!sessionToken) {
      return neutralResult();
    }

    const revoked = await this.dependencies.sessions.revoke(
      this.dependencies.tokenDigester.digest(sessionToken),
      this.dependencies.clock.now(),
      'LOGOUT',
    );

    return { accepted: true, revoked };
  }
}

function neutralResult(): LogoutSessionResult {
  return { accepted: true, revoked: false };
}
