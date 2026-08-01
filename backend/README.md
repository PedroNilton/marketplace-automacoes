# Backend

API REST do Marketplace de Automações, construída com NestJS e TypeScript.

## Comandos

Execute a partir da raiz do repositório:

```bash
npm run dev:backend
npm run lint --workspace backend
npm run test --workspace backend
npm run test:e2e --workspace backend
npm run build --workspace backend
```

Por padrão, a API inicia em `http://localhost:3001`. A verificação técnica de saúde está disponível em `GET /health`.

Antes da primeira execução, prepare o `.env` da raiz conforme [`../docs/development/ENVIRONMENT-CONFIGURATION.md`](../docs/development/ENVIRONMENT-CONFIGURATION.md).
