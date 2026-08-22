'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { ApiProblemError } from '@/lib/api/problem-details';
import {
  createIdentityApiClient,
  type CurrentIdentity,
  type IdentityApiClient,
} from '@/lib/api/identity-api-client';

export interface AuthState {
  readonly identity: CurrentIdentity | null;
  readonly status: 'loading' | 'anonymous' | 'authenticated' | 'error';
  readonly error: ApiProblemError | null;
}

export interface AuthContextValue extends AuthState {
  refresh(): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const client = useMemo(() => createIdentityApiClient(), []);
  const value = useAuthState(client);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return value;
}

function useAuthState(client: IdentityApiClient): AuthContextValue {
  const [state, setState] = useState<AuthState>({
    identity: null,
    status: 'loading',
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      const identity = await client.currentIdentity();
      setState({ identity, status: 'authenticated', error: null });
    } catch (error) {
      if (isAnonymous(error)) {
        setState({ identity: null, status: 'anonymous', error: null });
        return;
      }

      setState({
        identity: null,
        status: 'error',
        error: error instanceof ApiProblemError ? error : null,
      });
    }
  }, [client]);

  const logout = useCallback(async () => {
    const csrfToken = state.identity?.session.csrfToken;

    if (csrfToken) {
      await client.logout(csrfToken);
    }

    setState({ identity: null, status: 'anonymous', error: null });
  }, [client, state.identity]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(refreshTimer);
  }, [refresh]);

  return { ...state, refresh, logout };
}

function isAnonymous(error: unknown): boolean {
  return error instanceof ApiProblemError && error.problem.status === 401;
}
