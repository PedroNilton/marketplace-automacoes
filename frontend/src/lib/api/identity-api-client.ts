import {
  ApiProblemError,
  isProblemDetails,
  ProblemDetails,
} from './problem-details';

export interface IdentityUser {
  readonly id: string;
  readonly displayName: string;
  readonly emailVerified: boolean;
  readonly platformRole: 'MEMBER' | 'ADMIN';
}

export interface CurrentIdentity {
  readonly user: IdentityUser;
  readonly session: {
    readonly restricted: boolean;
    readonly csrfToken: string;
  };
}

export interface LoginResult extends CurrentIdentity {
  readonly session: CurrentIdentity['session'] & { readonly returnTo: string };
}

export interface NeutralAcceptedResponse {
  readonly message: string;
}

export interface RegisterInput {
  readonly displayName: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirmation: string;
  readonly termsVersion: string;
  readonly privacyVersion: string;
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
  readonly returnTo?: string;
}

export interface ConfirmPasswordResetInput {
  readonly token: string;
  readonly password: string;
  readonly passwordConfirmation: string;
}

export interface IdentityApiClient {
  register(input: RegisterInput): Promise<NeutralAcceptedResponse>;
  confirmEmail(token: string): Promise<void>;
  resendEmailVerification(email: string): Promise<NeutralAcceptedResponse>;
  login(input: LoginInput): Promise<LoginResult>;
  currentIdentity(): Promise<CurrentIdentity>;
  logout(csrfToken: string): Promise<void>;
  requestPasswordReset(email: string): Promise<NeutralAcceptedResponse>;
  confirmPasswordReset(input: ConfirmPasswordResetInput): Promise<void>;
}

export interface IdentityApiClientOptions {
  readonly origin?: string;
  readonly fetcher?: typeof fetch;
}

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:3001';

export function createIdentityApiClient(
  options: IdentityApiClientOptions = {},
): IdentityApiClient {
  const origin = normalizeOrigin(options.origin ?? API_ORIGIN);
  const fetcher = options.fetcher ?? fetch;

  return {
    register: (input) =>
      requestJson(fetcher, origin, '/v1/auth/registrations', 'POST', input),
    confirmEmail: (token) =>
      requestEmpty(
        fetcher,
        origin,
        '/v1/auth/email-verifications/confirmations',
        'POST',
        {
          token,
        },
      ),
    resendEmailVerification: (email) =>
      requestJson(
        fetcher,
        origin,
        '/v1/auth/email-verifications/requests',
        'POST',
        { email },
      ),
    login: (input) =>
      requestJson(fetcher, origin, '/v1/auth/sessions', 'POST', input),
    currentIdentity: () =>
      requestJson(fetcher, origin, '/v1/auth/session', 'GET'),
    logout: (csrfToken) =>
      requestEmpty(
        fetcher,
        origin,
        '/v1/auth/session',
        'DELETE',
        undefined,
        csrfToken,
      ),
    requestPasswordReset: (email) =>
      requestJson(
        fetcher,
        origin,
        '/v1/auth/password-resets/requests',
        'POST',
        { email },
      ),
    confirmPasswordReset: (input) =>
      requestEmpty(
        fetcher,
        origin,
        '/v1/auth/password-resets/confirmations',
        'POST',
        input,
      ),
  };
}

async function requestJson<T>(
  fetcher: typeof fetch,
  origin: string,
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<T> {
  const response = await request(fetcher, origin, path, method, body);
  return response.json() as Promise<T>;
}

async function requestEmpty(
  fetcher: typeof fetch,
  origin: string,
  path: string,
  method: 'POST' | 'DELETE',
  body?: unknown,
  csrfToken?: string,
): Promise<void> {
  await request(fetcher, origin, path, method, body, csrfToken);
}

async function request(
  fetcher: typeof fetch,
  origin: string,
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: unknown,
  csrfToken?: string,
): Promise<Response> {
  const response = await fetcher(new URL(path, origin), {
    method,
    credentials: 'include',
    headers: headers(body, csrfToken),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw await responseError(response);
  }

  return response;
}

function headers(body: unknown, csrfToken?: string): Headers {
  const result = new Headers({ Accept: 'application/json' });

  if (body !== undefined) {
    result.set('Content-Type', 'application/json');
  }
  if (csrfToken) {
    result.set('X-CSRF-Token', csrfToken);
  }

  return result;
}

async function responseError(response: Response): Promise<ApiProblemError> {
  const fallback: ProblemDetails = {
    type: 'about:blank',
    title: 'Não foi possível concluir a solicitação.',
    status: response.status,
    code: 'request_failed',
  };

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/problem+json')) {
    return new ApiProblemError(fallback);
  }

  const body: unknown = await response.json().catch(() => null);
  return new ApiProblemError(isProblemDetails(body) ? body : fallback);
}

function normalizeOrigin(value: string): string {
  const url = new URL(value);

  return url.origin;
}
