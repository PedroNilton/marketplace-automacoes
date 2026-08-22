# Frontend

Aplicação web do Marketplace de Automações, construída com Next.js, React, TypeScript e Tailwind CSS.

## Comandos

Execute a partir da raiz do repositório:

```bash
npm run dev:frontend
npm run format:check --workspace frontend
npm run lint --workspace frontend
npm run build --workspace frontend
```

Por padrão, a aplicação inicia em `http://localhost:3000`.

Para conectar a interface à API local, copie `.env.example` para `.env.local`.
`NEXT_PUBLIC_API_ORIGIN` é uma origem pública, não deve conter segredo.

O fluxo completo de validação está em [`../docs/development/QUALITY-COMMANDS.md`](../docs/development/QUALITY-COMMANDS.md).
