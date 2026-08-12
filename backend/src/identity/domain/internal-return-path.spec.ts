import { InternalReturnPath } from './internal-return-path';

describe('InternalReturnPath', () => {
  const fallback = '/conta';

  it.each([
    '/',
    '/conta',
    '/conta/perfil',
    '/ofertas/123/solicitar',
    '/pedidos?estado=ativo',
    '/conta?aba=perfil#seguranca',
    '/ofertas/automação',
  ])('preserves the allowed internal destination %s', (candidate) => {
    expect(InternalReturnPath.resolve(candidate)).toBe(candidate);
  });

  it.each([
    ['missing value', undefined],
    ['null value', null],
    ['empty value', ''],
    ['leading whitespace', ' /conta'],
    ['trailing whitespace', '/conta '],
    ['absolute HTTPS URL', 'https://evil.example/phishing'],
    ['absolute HTTP URL', 'http://evil.example/phishing'],
    ['JavaScript scheme', 'javascript:alert(1)'],
    ['data scheme', 'data:text/html,phishing'],
    ['scheme-relative URL', '//evil.example/phishing'],
    ['triple-slash URL', '///evil.example/phishing'],
    ['backslash authority', '/\\evil.example/phishing'],
    ['plain parent segment', '/ofertas/../admin'],
    ['plain current segment', '/ofertas/./123'],
    ['encoded parent segment', '/%2e%2e/admin'],
    ['encoded slash', '/%2f%2fevil.example'],
    ['encoded backslash', '/%5cevil.example'],
    ['encoded control character', '/%0devil'],
    ['literal control character', '/conta\rmaliciosa'],
    ['invalid percent encoding', '/%ZZ'],
    ['sign-in loop', '/entrar'],
    ['nested sign-in loop', '/entrar/continuar'],
    ['encoded sign-in loop', '/%65ntrar'],
    ['registration loop', '/cadastro'],
    ['API destination', '/api/auth'],
    ['framework destination', '/_next/static/chunk.js'],
    ['oversized value', `/${'a'.repeat(2_048)}`],
  ] as const)('uses the safe fallback for %s', (_scenario, candidate) => {
    expect(InternalReturnPath.resolve(candidate)).toBe(fallback);
  });

  it('publishes the same safe fallback used during resolution', () => {
    expect(InternalReturnPath.fallback).toBe(fallback);
  });
});
