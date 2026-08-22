# Configuração de ambiente

A API usa uma configuração centralizada, tipada e validada durante a inicialização. Valores inválidos ou segredos obrigatórios ausentes impedem o processo de iniciar.

## Preparação local

1. Copie `.env.example` para `.env` na raiz do repositório.
2. Gere um segredo HMAC local com pelo menos 32 bytes:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

3. Substitua o valor de `AUTH_HMAC_SECRET` no `.env` pelo resultado.
4. Inicie a infraestrutura com `npm run infra:up`.
5. Inicie a API com `npm run dev:backend`.

O `.env` real é ignorado pelo Git. Somente o `.env.example`, com padrões locais e placeholders não secretos, pode ser versionado. O frontend possui seu próprio `frontend/.env.example`: copie-o para `frontend/.env.local` e configure `NEXT_PUBLIC_API_ORIGIN` com a origem pública da API, sem segredos.

## Grupos de configuração

| Grupo | Variáveis principais |
|---|---|
| Runtime | `NODE_ENV`, `PORT`, `API_ORIGIN`, `FRONTEND_ORIGIN` |
| PostgreSQL | `DATABASE_URL` e variáveis locais do Compose |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` |
| HMAC | `AUTH_HMAC_SECRET` |
| Cookie | `SESSION_COOKIE_NAME`, `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAME_SITE` |
| Sessão e tokens | TTLs, intervalo de atividade e cooldowns |
| Proteção contra abuso | limites de reenvio, recuperação e login |
| Senha | parâmetros do Argon2id |

As durações do `.env.example` são expressas em segundos e são convertidas para números pelo validador.

## Regras de validação

- Portas devem estar entre `1` e `65535`.
- `DATABASE_URL` deve usar o protocolo `postgres` ou `postgresql`.
- Origens devem ser URLs válidas.
- Booleanos aceitam somente `true` ou `false`.
- `AUTH_HMAC_SECRET` é obrigatório, deve possuir pelo menos 32 caracteres e não pode permanecer com o placeholder do exemplo.
- A duração ociosa da sessão não pode superar a duração absoluta.
- O intervalo de atualização de atividade não pode superar a duração ociosa.
- `SameSite=none` exige cookie seguro.
- Argon2id aceita no mínimo 19.456 KiB de memória, 2 iterações e paralelismo 1; os valores podem ser elevados após benchmark, mas não reduzidos abaixo dessa base.

Em produção, regras adicionais impedem que exceções locais sejam herdadas:

- `API_ORIGIN` e `FRONTEND_ORIGIN` devem usar HTTPS.
- O cookie deve usar `Secure`.
- O nome do cookie deve começar com `__Host-`.
- O arquivo `.env` local não é carregado; valores devem vir do ambiente ou do gerenciador de segredos escolhido.

## Acesso tipado

O `ConfigModule` valida o ambiente uma única vez e o `ConfigService` expõe somente valores validados. Código de aplicação não deve acessar `process.env` diretamente.

Erros de configuração informam os nomes dos campos inválidos, mas não reproduzem seus valores; isso evita incluir segredos em mensagens e logs.

## Estado da implementação

Prisma, migrations e hashing Argon2id já consomem essa configuração. Cookies reais, CORS, sessões e envio de e-mail serão implementados apenas nas tarefas correspondentes.
