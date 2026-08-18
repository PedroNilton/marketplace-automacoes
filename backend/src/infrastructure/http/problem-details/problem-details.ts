export interface ProblemFieldError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly code: string;
  readonly instance: string;
  readonly errors?: readonly ProblemFieldError[];
}

export interface ProblemDescriptor {
  readonly typeSlug: string;
  readonly title: string;
  readonly status: number;
  readonly code: string;
  readonly errors?: readonly ProblemFieldError[];
  readonly retryAfterSeconds?: number;
}
