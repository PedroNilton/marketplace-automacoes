# Prisma no backend

Este documento descreve a integração entre NestJS, Prisma ORM e o PostgreSQL local. A configuração base pertence à tarefa `T-001-007` e a migration inicial à `T-001-008` da Spec 001.

## Responsabilidade

A integração configura o cliente, a injeção no NestJS, testes reais de conexão e a persistência inicial de identidade. Repositórios e casos de uso serão implementados nas tarefas seguintes.

```text
NestJS → PrismaModule → PrismaService → Prisma Client → adapter pg → PostgreSQL
```

Somente o backend possui dependências e acesso ao Prisma. O frontend não conhece a conexão e nunca deve acessar o PostgreSQL diretamente.

## Configuração

- `backend/prisma.config.ts`: localização do schema, migrations e leitura opcional do `.env` da raiz para comandos da CLI.
- `backend/prisma/schema.prisma`: provider PostgreSQL, gerador e modelos reconhecidos pelo Prisma.
- `backend/prisma/migrations/`: histórico SQL versionado do banco.
- `backend/src/infrastructure/database/prisma.module.ts`: módulo que exporta o cliente injetável.
- `backend/src/infrastructure/database/prisma.service.ts`: cria o adapter PostgreSQL e controla conexão e desconexão pelo ciclo de vida do NestJS.

O Prisma ORM 7 gera código em `backend/src/generated/prisma`. Esse diretório é recriado automaticamente, ignorado pelo Git, pelo lint e pela formatação.

O gerador usa `moduleFormat = "cjs"` para permanecer compatível com o formato atual do backend NestJS. Uma eventual migração completa para ESM deverá ser uma decisão separada.

## Comandos

Execute a partir da raiz do repositório:

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:migrate:status
npm run test:integration
```

- `prisma:validate`: valida a configuração e o schema sem alterar o banco.
- `prisma:generate`: recria o cliente tipado sem exigir que o PostgreSQL esteja iniciado.
- `prisma:migrate:deploy`: aplica migrations pendentes no banco configurado.
- `prisma:migrate:status`: informa se o banco está sincronizado com o histórico.
- `test:integration`: valida conexão, estruturas e constraints sem deixar dados persistidos.

O build do backend executa a geração antes de compilar. A instalação por `npm ci` também gera o cliente pelo `postinstall` do workspace.

## Teste de conexão

Inicie a infraestrutura antes do teste:

```bash
npm run infra:up
npm run infra:status
npm run prisma:migrate:deploy
npm run test:integration
```

O PostgreSQL deverá aparecer como `healthy`. Os testes usam a `DATABASE_URL` local preparada para testes, verificam a conexão e executam cenários de integridade em transações revertidas.

Como `npm run quality` inclui a suíte de integração, o PostgreSQL local também precisa estar disponível durante a verificação completa.

## Migrations

Toda alteração estrutural será criada por Prisma Migrate e versionada no Git. O processo completo está em [`DATABASE-MIGRATIONS.md`](DATABASE-MIGRATIONS.md).
