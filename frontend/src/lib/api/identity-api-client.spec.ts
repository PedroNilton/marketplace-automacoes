import { ApiProblemError } from './problem-details';
import { createIdentityApiClient } from './identity-api-client';

describe('IdentityApiClient', () => {
  const origin = 'http://127.0.0.1:3001';
  const identity = {
    user: {
      id: 'user-id',
      displayName: 'Mariana Souza',
      emailVerified: true,
      platformRole: 'MEMBER' as const,
    },
    session: { restricted: false, csrfToken: 'csrf-token' },
  };

  it('uses the browser session cookie when resolving the current identity', async () => {
    const fetcher = jest.fn().mockResolvedValue(jsonResponse(identity));
    const client = createIdentityApiClient({ origin, fetcher });

    await expect(client.currentIdentity()).resolves.toEqual(identity);
    expect(fetcher).toHaveBeenCalledWith(
      new URL('/v1/auth/session', origin),
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('keeps CSRF in the request header when ending the session', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createIdentityApiClient({ origin, fetcher });

    await expect(client.logout('csrf-token')).resolves.toBeUndefined();
    const request = fetcher.mock.calls[0][1] as RequestInit;

    expect(request.credentials).toBe('include');
    expect(new Headers(request.headers).get('X-CSRF-Token')).toBe('csrf-token');
  });

  it('exposes typed Problem Details instead of an unstructured failure', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          type: 'https://marketplace.example/problems/authentication-required',
          title: 'Autenticação necessária.',
          status: 401,
          code: 'authentication_required',
        },
        401,
        'application/problem+json',
      ),
    );
    const client = createIdentityApiClient({ origin, fetcher });

    await expect(client.currentIdentity()).rejects.toMatchObject<
      Partial<ApiProblemError>
    >({
      problem: expect.objectContaining({
        status: 401,
        code: 'authentication_required',
      }),
    });
  });

  it('does not preserve identity or CSRF when a new client is created after reload', async () => {
    const firstFetcher = jest.fn().mockResolvedValue(jsonResponse(identity));
    const firstClient = createIdentityApiClient({
      origin,
      fetcher: firstFetcher,
    });
    await firstClient.currentIdentity();

    const secondFetcher = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          type: 'https://marketplace.example/problems/authentication-required',
          title: 'Autenticação necessária.',
          status: 401,
          code: 'authentication_required',
        },
        401,
        'application/problem+json',
      ),
    );
    const reloadedClient = createIdentityApiClient({
      origin,
      fetcher: secondFetcher,
    });

    await expect(reloadedClient.currentIdentity()).rejects.toBeInstanceOf(
      ApiProblemError,
    );
    expect(secondFetcher).toHaveBeenCalledTimes(1);
  });
});

function jsonResponse(
  body: unknown,
  status = 200,
  contentType = 'application/json',
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': contentType },
  });
}
