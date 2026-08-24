import { postLoginPath, readLoginReturnTo } from './login-navigation';

describe('login navigation', () => {
  it('keeps an allowed local return path', () => {
    expect(readLoginReturnTo('?returnTo=%2Fofertas%3Fpage%3D2')).toBe(
      '/ofertas?page=2',
    );
  });

  it.each([
    'https://attacker.example',
    '//attacker.example',
    '/\\attacker',
    '',
  ])('does not use an unsafe return path: %s', (value) => {
    expect(
      readLoginReturnTo(`?returnTo=${encodeURIComponent(value)}`),
    ).toBeUndefined();
  });

  it('sends a restricted session to email verification', () => {
    expect(postLoginPath({ restricted: true, returnTo: '/ofertas' })).toBe(
      '/verificar-email',
    );
  });

  it('uses the internal fallback for a normal session', () => {
    expect(postLoginPath({ restricted: false, returnTo: '/ofertas' })).toBe(
      '/ofertas',
    );
    expect(
      postLoginPath({
        restricted: false,
        returnTo: 'https://attacker.example',
      }),
    ).toBe('/');
  });
});
