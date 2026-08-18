import { readSessionCookie } from './session-cookie';

describe('readSessionCookie', () => {
  it('reads only the cookie with the exact configured name', () => {
    expect(
      readSessionCookie(
        'other=ignored; marketplace_session=token-123',
        'marketplace_session',
      ),
    ).toBe('token-123');
  });

  it.each([
    [undefined],
    ['marketplace_session='],
    ['marketplace_session=one; marketplace_session=two'],
    ['marketplace_session=%E0%A4%A'],
  ])('rejects missing, empty, duplicate or malformed values', (header) => {
    expect(readSessionCookie(header, 'marketplace_session')).toBeNull();
  });
});
