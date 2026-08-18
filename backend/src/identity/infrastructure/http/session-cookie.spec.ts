import { readCookie } from './session-cookie';

describe('readCookie', () => {
  it('reads only the cookie with the exact configured name', () => {
    expect(
      readCookie(
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
    expect(readCookie(header, 'marketplace_session')).toBeNull();
  });
});
