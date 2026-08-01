# Backend

API REST do Marketplace de Automações, construída com NestJS e TypeScript.

## Comandos

Execute a partir da raiz do repositório:

```bash
npm run dev:backend
npm run format:check --workspace backend
npm run prisma:validate
npm run prisma:generate
npm run lint --workspace backend
npm run test:unit --workspace backend
npm run test:integration
npm run test:e2e --workspace backend
npm run build --workspace backend
```

Por padrão, a API inicia em `http://localhost:3001`. A verificação técnica de saúde está disponível em `GET /health`.

Antes da primeira execução, prepare o `.env` da raiz conforme [`../docs/development/ENVIRONMENT-CONFIGURATION.md`](../docs/development/ENVIRONMENT-CONFIGURATION.md).

O fluxo completo de validação está em [`../docs/development/QUALITY-COMMANDS.md`](../docs/development/QUALITY-COMMANDS.md).

A integração com PostgreSQL está em [`../docs/development/PRISMA.md`](../docs/development/PRISMA.md).
