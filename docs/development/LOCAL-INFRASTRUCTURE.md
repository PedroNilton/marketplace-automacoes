# Infraestrutura local

Este documento descreve os serviços locais usados no desenvolvimento do Marketplace de Automações. Eles são executados pelo Docker Compose e não dependem de Supabase ou de outro BaaS.

## Pré-requisitos

- Docker Desktop com Docker Compose.
- Portas locais `5433`, `1025` e `8025` disponíveis, ou portas alternativas definidas antes da execução.

## Serviços

| Serviço | Imagem fixa | Endereço local | Finalidade |
|---|---|---|---|
| PostgreSQL | `postgres:17.10-alpine3.23` | `127.0.0.1:5433` | Persistência do marketplace |
| Mailpit SMTP | `axllent/mailpit:v1.30.0` | `127.0.0.1:1025` | Captura de e-mails de desenvolvimento |
| Mailpit Web/API | `axllent/mailpit:v1.30.0` | `http://127.0.0.1:8025` | Inspeção e teste dos e-mails capturados |

As portas são publicadas somente na interface local. Dentro da rede Docker, o PostgreSQL continua disponível como `postgres:5432` e o Mailpit como `mailpit:1025` e `mailpit:8025`.

## Comandos

Execute a partir da raiz do repositório:

```bash
npm run infra:up
npm run infra:status
npm run infra:logs
npm run infra:down
```

- `infra:up`: cria ou inicia os serviços em segundo plano.
- `infra:status`: mostra portas, estado e healthchecks.
- `infra:logs`: acompanha os logs até ser interrompido.
- `infra:down`: encerra e remove os containers e a rede, preservando os volumes.

Os volumes `marketplace-automacoes-postgres-data` e `marketplace-automacoes-mailpit-data` preservam dados entre reinicializações. Para apagar também os dados locais, use conscientemente `docker compose down --volumes`.

## Conexão pelo DBeaver

Use estes valores apenas no ambiente local:

| Campo | Valor padrão |
|---|---|
| Host | `127.0.0.1` |
| Porta | `5433` |
| Banco | `marketplace_automacoes` |
| Usuário | `marketplace` |
| Senha | `marketplace_local` |

Esses valores são credenciais de desenvolvimento sem privilégio fora do container local. Eles nunca devem ser reutilizados em homologação ou produção.

## Personalização local

O Compose aceita as seguintes variáveis opcionais:

| Variável | Padrão |
|---|---|
| `POSTGRES_DB` | `marketplace_automacoes` |
| `POSTGRES_USER` | `marketplace` |
| `POSTGRES_PASSWORD` | `marketplace_local` |
| `POSTGRES_PORT` | `5433` |
| `MAILPIT_SMTP_PORT` | `1025` |
| `MAILPIT_HTTP_PORT` | `8025` |
| `MAILPIT_MAX_MESSAGES` | `500` |

A configuração tipada das aplicações e o arquivo `.env.example` pertencem à tarefa `T-001-005`; não são antecipados nesta entrega.

## Verificação manual

Após `npm run infra:up`:

1. Confirme que os dois serviços aparecem como `healthy` em `npm run infra:status`.
2. Teste a conexão PostgreSQL pelo DBeaver usando os dados locais acima.
3. Abra `http://127.0.0.1:8025` e confirme que a interface do Mailpit responde.
4. Use `http://127.0.0.1:8025/api/v1/messages` para confirmar que a API local responde.

O Mailpit é somente um capturador local: nenhum e-mail recebido por ele é enviado a um destinatário real.
