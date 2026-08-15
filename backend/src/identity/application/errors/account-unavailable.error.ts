export class AccountUnavailableError extends Error {
  readonly code = 'ACCOUNT_UNAVAILABLE';

  constructor() {
    super('The account is unavailable.');
    this.name = AccountUnavailableError.name;
  }
}
