/* eslint-disable @typescript-eslint/unbound-method */
import { ResolvedSession } from '../domain/session';
import { AuthenticationRequiredError } from './errors/authentication-required.error';
import {
  GetCurrentIdentity,
  GetCurrentIdentityDependencies,
  GetCurrentIdentityOptions,
} from './get-current-identity';
import { Clock } from './ports/clock';
import { CsrfTokenDeriver } from './ports/csrf-token-deriver';
import { SessionRepository } from './ports/session-repository';
import { TokenDigester } from './ports/token-digester';

describe('GetCurrentIdentity', () => {
  const sessionToken = 'a'.repeat(43);
  const now = new Date('2026-08-15T22:00:00.000Z');
  const options: GetCurrentIdentityOptions = {
    sessionIdleTtlSeconds: 86_400,
    activityTouchIntervalSeconds: 900,
  };

  let sessions: jest.Mocked<SessionRepository>;
  let csrfTokens: jest.Mocked<CsrfTokenDeriver>;
  let tokenDigester: jest.Mocked<TokenDigester>;
  let clock: jest.Mocked<Clock>;
  let dependencies: GetCurrentIdentityDependencies;

  beforeEach(() => {
    sessions = portMock<SessionRepository>();
    csrfTokens = portMock<CsrfTokenDeriver>();
    tokenDigester = portMock<TokenDigester>();
    clock = portMock<Clock>();

    sessions.resolve.mockResolvedValue(resolvedSession());
    sessions.touch.mockResolvedValue(true);
    csrfTokens.derive.mockReturnValue('derived-csrf-token');
    tokenDigester.digest.mockReturnValue('session-token-digest');
    tokenDigester.matches.mockReturnValue(true);
    clock.now.mockReturnValue(now);
    dependencies = { sessions, csrfTokens, tokenDigester, clock };
  });

  it('returns the minimal verified identity and its reproducible CSRF token', async () => {
    const result = await useCase().execute({ sessionToken });

    expect(tokenDigester.digest).toHaveBeenCalledWith(sessionToken);
    expect(sessions.resolve).toHaveBeenCalledWith('session-token-digest', now);
    expect(csrfTokens.derive).toHaveBeenCalledWith(sessionToken);
    expect(tokenDigester.matches).toHaveBeenCalledWith(
      'derived-csrf-token',
      'stored-csrf-digest',
    );
    expect(result).toEqual({
      user: {
        id: 'user-id',
        displayName: 'Mariana Souza',
        emailVerified: true,
        platformRole: 'MEMBER',
      },
      session: {
        restricted: false,
        csrfToken: 'derived-csrf-token',
      },
    });
    expect(JSON.stringify(result)).not.toContain('session-token-digest');
    expect(JSON.stringify(result)).not.toContain('stored-csrf-digest');
  });

  it('distinguishes an active unverified identity as restricted', async () => {
    sessions.resolve.mockResolvedValue(
      resolvedSession({ emailVerifiedAt: null }),
    );

    await expect(useCase().execute({ sessionToken })).resolves.toMatchObject({
      user: { emailVerified: false },
      session: { restricted: true },
    });
  });

  it('preserves the administrative role without granting it by verification', async () => {
    sessions.resolve.mockResolvedValue(
      resolvedSession({ platformRole: 'ADMIN' }),
    );

    await expect(useCase().execute({ sessionToken })).resolves.toMatchObject({
      user: { platformRole: 'ADMIN', emailVerified: true },
      session: { restricted: false },
    });
  });

  it.each([null, undefined, '', 'short', 'x'.repeat(44), 'invalid token'])(
    'rejects an absent or malformed token without consulting persistence',
    async (invalidToken) => {
      await expect(
        useCase().execute({ sessionToken: invalidToken }),
      ).rejects.toBeInstanceOf(AuthenticationRequiredError);
      expect(tokenDigester.digest).not.toHaveBeenCalled();
      expect(sessions.resolve).not.toHaveBeenCalled();
    },
  );

  it('uses one generic failure for an unresolved session', async () => {
    sessions.resolve.mockResolvedValue(null);

    await expect(useCase().execute({ sessionToken })).rejects.toEqual(
      new AuthenticationRequiredError(),
    );
    expect(csrfTokens.derive).not.toHaveBeenCalled();
    expect(sessions.touch).not.toHaveBeenCalled();
  });

  it('rejects a session whose stored CSRF digest is inconsistent', async () => {
    tokenDigester.matches.mockReturnValue(false);

    await expect(useCase().execute({ sessionToken })).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );
    expect(sessions.touch).not.toHaveBeenCalled();
  });

  it('extends activity at the exact configured interval boundary', async () => {
    sessions.resolve.mockResolvedValue(
      resolvedSession({
        lastSeenAt: new Date('2026-08-15T21:45:00.000Z'),
      }),
    );

    await useCase().execute({ sessionToken });

    expect(sessions.touch).toHaveBeenCalledWith({
      tokenDigest: 'session-token-digest',
      touchedAt: now,
      touchIfLastSeenBefore: new Date('2026-08-15T21:45:00.000Z'),
      idleExpiresAt: new Date('2026-08-16T22:00:00.000Z'),
    });
  });

  it('does not write activity again before the configured interval', async () => {
    sessions.resolve.mockResolvedValue(
      resolvedSession({
        lastSeenAt: new Date('2026-08-15T21:45:00.001Z'),
      }),
    );

    await useCase().execute({ sessionToken });

    expect(sessions.touch).not.toHaveBeenCalled();
  });

  it('revalidates after losing a concurrent activity update', async () => {
    const resolved = resolvedSession({
      lastSeenAt: new Date('2026-08-15T21:30:00.000Z'),
    });
    sessions.resolve.mockResolvedValue(resolved);
    sessions.touch.mockResolvedValue(false);

    await expect(useCase().execute({ sessionToken })).resolves.toMatchObject({
      user: { id: 'user-id' },
    });
    expect(sessions.resolve).toHaveBeenCalledTimes(2);
    expect(tokenDigester.matches).toHaveBeenCalledTimes(2);
  });

  it('fails generically when the session becomes invalid during activity update', async () => {
    sessions.resolve
      .mockResolvedValueOnce(
        resolvedSession({
          lastSeenAt: new Date('2026-08-15T21:30:00.000Z'),
        }),
      )
      .mockResolvedValueOnce(null);
    sessions.touch.mockResolvedValue(false);

    await expect(useCase().execute({ sessionToken })).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );
  });

  it.each([
    ['idle TTL', { sessionIdleTtlSeconds: 0 }],
    ['touch interval', { activityTouchIntervalSeconds: -1 }],
    ['fractional interval', { activityTouchIntervalSeconds: 1.5 }],
  ])('rejects invalid %s options', (_scenario, overrides) => {
    expect(
      () => new GetCurrentIdentity(dependencies, { ...options, ...overrides }),
    ).toThrow(RangeError);
  });

  it('rejects a touch interval longer than the idle TTL', () => {
    expect(
      () =>
        new GetCurrentIdentity(dependencies, {
          sessionIdleTtlSeconds: 60,
          activityTouchIntervalSeconds: 61,
        }),
    ).toThrow(RangeError);
  });

  function useCase(): GetCurrentIdentity {
    return new GetCurrentIdentity(dependencies, options);
  }
});

function resolvedSession(
  overrides: Partial<{
    lastSeenAt: Date;
    emailVerifiedAt: Date | null;
    platformRole: 'MEMBER' | 'ADMIN';
  }> = {},
): ResolvedSession {
  const createdAt = new Date('2026-08-15T20:00:00.000Z');

  return {
    session: {
      id: 'session-id',
      userId: 'user-id',
      tokenDigest: 'session-token-digest',
      csrfDigest: 'stored-csrf-digest',
      createdAt,
      lastSeenAt: overrides.lastSeenAt ?? new Date('2026-08-15T21:50:00.000Z'),
      idleExpiresAt: new Date('2026-08-16T20:00:00.000Z'),
      absoluteExpiresAt: new Date('2026-08-22T20:00:00.000Z'),
      revokedAt: null,
      revokeReason: null,
    },
    identity: {
      userId: 'user-id',
      displayName: 'Mariana Souza',
      emailVerifiedAt:
        overrides.emailVerifiedAt === undefined
          ? new Date('2026-08-15T20:30:00.000Z')
          : overrides.emailVerifiedAt,
      platformRole: overrides.platformRole ?? 'MEMBER',
    },
  };
}

function portMock<T>(): jest.Mocked<T> {
  return {
    create: jest.fn(),
    resolve: jest.fn(),
    touch: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
    derive: jest.fn(),
    digest: jest.fn(),
    matches: jest.fn(),
    now: jest.fn(),
  } as unknown as jest.Mocked<T>;
}
