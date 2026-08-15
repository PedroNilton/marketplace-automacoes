export class AuthenticationRequiredError extends Error {
  readonly code = 'AUTHENTICATION_REQUIRED';

  constructor() {
    super('Authentication is required.');
    this.name = AuthenticationRequiredError.name;
  }
}
