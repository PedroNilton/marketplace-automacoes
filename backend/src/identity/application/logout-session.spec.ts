/* eslint-disable @typescript-eslint/unbound-method */
import { LogoutSession, LogoutSessionDependencies } from './logout-session';
import { Clock } from './ports/clock';
import { SessionRepository } from './ports/session-repository';
import { TokenDigester } from './ports/token-digester';

describe('LogoutSession', () => {
  const sessionToken = 'a'.repeat(43);
  const now = new Date('2026-08-16T10:00:00.000Z');

  let sessions: jest.Mocked<SessionRepository>;
  let tokenDigester: jest.Mocked<TokenDigester>;
  let clock: jest.Mocked<Clock>;
  let dependencies: LogoutSessionDependencies;

  beforeEach(() => {
    sessions = portMock<SessionRepository>();
    tokenDigester = portMock<TokenDigester>();
    clock = portMock<Clock>();
    tokenDigester.digest.mockReturnValue('session-token-digest');
    sessions.revoke.mockResolvedValue(true);
    clock.now.mockReturnValue(now);
    dependencies = { sessions, tokenDigester, clock };
  });

  it('revokes the current session by digest', async () => {
    await expect(useCase().execute({ sessionToken })).resolves.toEqual({
      accepted: true,
      revoked: true,
    });
    expect(tokenDigester.digest).toHaveBeenCalledWith(sessionToken);
    expect(sessions.revoke).toHaveBeenCalledWith(
      'session-token-digest',
      now,
      'LOGOUT',
    );
  });

  it('keeps a repeated logout successful and idempotent', async () => {
    sessions.revoke.mockResolvedValue(false);

    await expect(useCase().execute({ sessionToken })).resolves.toEqual({
      accepted: true,
      revoked: false,
    });
  });

  it.each([null, undefined, '', 'short', 'x'.repeat(44), 'invalid token'])(
    'accepts an absent or malformed token without persistence',
    async (invalidToken) => {
      await expect(
        useCase().execute({ sessionToken: invalidToken }),
      ).resolves.toEqual({ accepted: true, revoked: false });
      expect(tokenDigester.digest).not.toHaveBeenCalled();
      expect(clock.now).not.toHaveBeenCalled();
      expect(sessions.revoke).not.toHaveBeenCalled();
    },
  );

  it('does not hide an unexpected persistence failure', async () => {
    sessions.revoke.mockRejectedValue(new Error('database unavailable'));

    await expect(useCase().execute({ sessionToken })).rejects.toThrow(
      'database unavailable',
    );
  });

  it('never exposes the raw token or its digest in the result', async () => {
    const result = await useCase().execute({ sessionToken });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(sessionToken);
    expect(serialized).not.toContain('session-token-digest');
  });

  function useCase(): LogoutSession {
    return new LogoutSession(dependencies);
  }
});

function portMock<T>(): jest.Mocked<T> {
  return {
    create: jest.fn(),
    resolve: jest.fn(),
    touch: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
    digest: jest.fn(),
    matches: jest.fn(),
    now: jest.fn(),
  } as unknown as jest.Mocked<T>;
}
