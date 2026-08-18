export class InvalidOrExpiredTokenError extends Error {
  constructor() {
    super('The token is invalid or expired.');
    this.name = 'InvalidOrExpiredTokenError';
  }
}
