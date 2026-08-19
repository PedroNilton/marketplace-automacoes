export class PlatformAccessDeniedError extends Error {
  readonly code = 'PLATFORM_ACCESS_DENIED';

  constructor() {
    super('The platform role does not grant access.');
    this.name = PlatformAccessDeniedError.name;
  }
}
