# Migrations do banco de dados

Este documento define como criar, aplicar e verificar migrations PostgreSQL do Marketplace de Automações.

## Fonte de verdade

- `backend/prisma/schema.prisma` descreve o modelo reconhecido pelo Prisma.
- `backend/prisma/migrations/` contém o histórico SQL imutável e versionado.
- A tabela `_prisma_migrations` registra quais migrations foram aplicadas em cada banco.

O DBeaver é usado somente para inspeção e consultas. Alterações estruturais manuais criariam divergência entre o banco, o schema e o histórico versionado.

## Preparar um ambiente local

Depois de preparar o `.env` da raiz, execute:

```bash
npm run infra:up
npm run infra:status
npm run prisma:migrate:deploy
npm run prisma:migrate:status
```

- `prisma:migrate:deploy` aplica migrations pendentes sem gerar novas migrations.
- `prisma:migrate:status` compara o histórico local com o banco configurado.

O PostgreSQL precisa estar saudável e a `DATABASE_URL` deve apontar para o ambiente pretendido.

## Criar uma nova migration

Uma mudança estrutural começa no `schema.prisma`. Depois da revisão do modelo, gere SQL sem aplicá-lo:

```bash
npm exec --workspace backend -- prisma migrate dev --name nome_da_migration --create-only
```

Revise o arquivo `migration.sql` antes de aplicar. Prisma Migrate permite SQL adicional quando uma regra PostgreSQL não possui representação declarativa, como a constraint que impede `attempt_count` negativo.

Depois da revisão, aplique a migration em um banco de desenvolvimento ou descartável com `npm run prisma:migrate:deploy`.

## Migration inicial de identidade

A migration `20260802203302_initial_identity` cria:

- cinco enums de identidade e autenticação;
- `users`, com e-mail único, estados e evidência dos aceites legais;
- `sessions`, com digests, expirações, revogação e FK restritiva;
- `auth_tokens`, com finalidade, consumo, invalidação e FK restritiva;
- `auth_rate_limits`, com chave composta e contador não negativo;
- índices de unicidade, expiração, limpeza e registros ativos ou pendentes.

Os testes de integração confirmam as estruturas e constraints dentro de transações revertidas, portanto não deixam contas, sessões, tokens ou contadores persistidos.

## Reaplicação e reversão

Em desenvolvimento, a prova de reaplicação deve usar um banco explicitamente descartável. O procedimento aprovado é:

1. criar o banco descartável;
2. aplicar todas as migrations com `prisma:migrate:deploy`;
3. verificar tabelas, histórico e constraints;
4. apagar somente o banco descartável;
5. recriá-lo e reaplicar todo o histórico.

Nunca execute reset ou descarte contra produção, homologação compartilhada ou um banco cujo conteúdo não tenha sido confirmado. Em ambientes persistentes, correções estruturais são feitas por uma nova migration à frente, sem editar ou apagar migrations já aplicadas.
