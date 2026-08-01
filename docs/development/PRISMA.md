# Prisma no backend

Este documento descreve a integração inicial entre NestJS, Prisma ORM e o PostgreSQL local. A configuração pertence à tarefa `T-001-007` da Spec 001.

## Limite desta etapa

A entrega configura o cliente, a injeção no NestJS e um teste real de conexão. Ela não cria tabelas, models ou migrations. A estrutura inicial de identidade pertence à tarefa `T-001-008`.

```text
NestJS → PrismaModule → PrismaService → Prisma Client → adapter pg → PostgreSQL
```

Somente o backend possui dependências e acesso ao Prisma. O frontend não conhece a conexão e nunca deve acessar o PostgreSQL diretamente.

## Configuração

- `backend/prisma.config.ts`: localização do schema, migrations futuras e leitura opcional do `.env` da raiz para comandos da CLI.
- `backend/prisma/schema.prisma`: provider PostgreSQL e gerador do cliente, ainda sem models.
- `backend/src/infrastructure/database/prisma.module.ts`: módulo que exporta o cliente injetável.
- `backend/src/infrastructure/database/prisma.service.ts`: cria o adapter PostgreSQL e controla conexão e desconexão pelo ciclo de vida do NestJS.

O Prisma ORM 7 gera código em `backend/src/generated/prisma`. Esse diretório é recriado automaticamente, ignorado pelo Git, pelo lint e pela formatação.

O gerador usa `moduleFormat = "cjs"` para permanecer compatível com o formato atual do backend NestJS. Uma eventual migração completa para ESM deverá ser uma decisão separada.

## Comandos

Execute a partir da raiz do repositório:

```bash
npm run prisma:validate
npm run prisma:generate
npm run test:integration
```

- `prisma:validate`: valida a configuração e o schema sem alterar o banco.
- `prisma:generate`: recria o cliente tipado sem exigir que o PostgreSQL esteja iniciado.
- `test:integration`: conecta ao PostgreSQL local, executa uma consulta mínima e encerra a conexão.

O build do backend executa a geração antes de compilar. A instalação por `npm ci` também gera o cliente pelo `postinstall` do workspace.

## Teste de conexão

Inicie a infraestrutura antes do teste:

```bash
npm run infra:up
npm run infra:status
npm run test:integration
```

O PostgreSQL deverá aparecer como `healthy`. O teste usa a `DATABASE_URL` local preparada para testes, executa somente `SELECT 1` e não cria tabelas ou registros.

Como `npm run quality` inclui a suíte de integração, o PostgreSQL local também precisa estar disponível durante a verificação completa.

## Evolução do banco

A partir da próxima tarefa, toda alteração estrutural será criada por Prisma Migrate e versionada no Git. O DBeaver continuará reservado para inspeção e consultas; ele não deve ser usado para alterar manualmente a estrutura do banco.
