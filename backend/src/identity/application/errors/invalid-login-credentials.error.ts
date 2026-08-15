export class InvalidLoginCredentialsError extends Error {
  readonly code = 'INVALID_LOGIN_CREDENTIALS';

  constructor() {
    super('Invalid login credentials.');
    this.name = InvalidLoginCredentialsError.name;
  }
}
