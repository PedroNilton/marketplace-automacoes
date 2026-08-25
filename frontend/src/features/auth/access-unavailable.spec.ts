import {
  accessUnavailableContent,
  readAccessUnavailableReason,
} from './access-unavailable';

describe('access unavailable states', () => {
  it.each([
    ['verification-required', '/verificar-email'],
    ['session-expired', '/entrar'],
    ['account-unavailable', '/entrar'],
    ['access-denied', '/'],
  ])('maps %s to a safe next action', (reason, actionHref) => {
    const parsed = readAccessUnavailableReason(reason);

    expect(accessUnavailableContent(parsed).actionHref).toBe(actionHref);
  });

  it('falls back to a neutral access-denied state for unknown input', () => {
    expect(readAccessUnavailableReason('sensitive-internal-reason')).toBe(
      'access-denied',
    );
    expect(readAccessUnavailableReason(['account-unavailable'])).toBe(
      'access-denied',
    );
  });
});
