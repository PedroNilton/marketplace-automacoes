# Suíte Unitária — Spec 001

Este documento registra a cobertura unitária consolidada da Spec 001 — Identidade e acesso. Ele não substitui os testes de integração, HTTP ou navegador: cada camada mantém sua responsabilidade própria.

## Execução

Na raiz do workspace:

```bash
npm run test:unit
```

Na consolidação da T-001-041, a execução isolada produziu:

| Workspace  | Suítes | Testes | Resultado |
| ---------- | -----: | -----: | --------- |
| `backend`  |     35 |    283 | aprovado  |
| `frontend` |      6 |     24 | aprovado  |

## Matriz de cobertura

| Área                     | Evidência unitária principal                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| E-mail e retorno interno | `email-address.spec.ts`, `internal-return-path.spec.ts`                                                |
| Senhas                   | `password-policy.spec.ts`, `confirm-password-reset.spec.ts`                                            |
| Tempo e tokens           | `clock.spec.ts`, geradores/digests de token e `confirm-email-verification.spec.ts`                     |
| Limites e abuso          | `rate-limit-decisions.spec.ts`, digest HMAC de chaves de limite                                        |
| Cadastro e verificação   | `register-user.spec.ts`, `confirm-email-verification.spec.ts`, `resend-email-verification.spec.ts`     |
| Login, sessão e saída    | `login-user.spec.ts`, `get-current-identity.spec.ts`, `logout-session.spec.ts`                         |
| Recuperação              | `request-password-reset.spec.ts`, `confirm-password-reset.spec.ts`                                     |
| Navegador e erros        | mapeador Problem Details, CORS, proteção de navegador, cookies e guards                                |
| Cliente e fluxos web     | cliente de identidade, validação de cadastro, tokens temporários, retorno de login e estados de acesso |

## Determinismo

Os testes unitários usam portas simuladas e relógios controlados quando o comportamento depende de expiração, limite ou tempo. Eles não precisam de PostgreSQL, Mailpit ou navegador real. Esses recursos pertencem às suítes das tarefas T-001-042 a T-001-044.

## Regra de manutenção

Toda nova política, caso de uso ou estado de interface da Spec 001 deve receber teste unitário determinístico antes de depender de integração ou E2E para ser verificado.
