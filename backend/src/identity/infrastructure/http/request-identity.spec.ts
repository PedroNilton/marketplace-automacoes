import type { Request } from 'express';
import { AuthenticationRequiredError } from '../../application/errors/authentication-required.error';
import {
  attachRequestIdentity,
  RequestIdentity,
  findRequestIdentity,
  requireRequestIdentity,
} from './request-identity';

describe('request identity', () => {
  const identity: RequestIdentity = {
    user: {
      id: 'user-1',
      displayName: 'Ana Souza',
      emailVerified: true,
      platformRole: 'MEMBER',
    },
    session: { restricted: false, csrfToken: 'csrf-token' },
  };

  it('attaches a non-enumerable minimal identity to the request', () => {
    const request = {} as Request;

    attachRequestIdentity(request, identity);

    expect(requireRequestIdentity(request)).toBe(identity);
    expect(findRequestIdentity(request)).toBe(identity);
    expect(Object.keys(request)).toEqual([]);
    expect(JSON.stringify(request)).not.toContain('csrf-token');
  });

  it('rejects access when no guard attached an identity', () => {
    expect(findRequestIdentity({} as Request)).toBeNull();
    expect(() => requireRequestIdentity({} as Request)).toThrow(
      AuthenticationRequiredError,
    );
  });
});
