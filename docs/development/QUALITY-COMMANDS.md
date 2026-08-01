# Comandos de Qualidade

Este documento define os comandos locais que protegem a qualidade mínima do workspace antes de um commit ou pull request.

## Preparação

Na raiz do repositório, instale exatamente as versões registradas no lockfile:

```bash
npm ci
```

## Verificação completa

Execute a verificação completa com:

```bash
npm run quality
```

O comando interrompe na primeira falha e executa, nesta ordem:

1. `format:check` — confirma que os arquivos acompanhados seguem o Prettier;
2. `lint` — executa as regras estáticas do backend e do frontend;
3. `test:unit` — executa os testes unitários disponíveis;
4. `test:e2e` — executa os testes ponta a ponta disponíveis;
5. `build` — compila todos os workspaces.

O comando não altera arquivos. Para corrigir somente a formatação, use:

```bash
npm run format
```

## Comandos individuais

Todos os comandos agregados são executáveis na raiz:

```bash
npm run format:check
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

Para executar um comando em apenas um workspace, acrescente `--workspace`:

```bash
npm run lint --workspace backend
npm run test:unit --workspace backend
npm run build --workspace backend

npm run lint --workspace frontend
npm run build --workspace frontend
```

Workspaces sem determinado script são ignorados pelos comandos agregados com `--if-present`. A ausência de uma suíte ainda não implementada não produz um falso erro.

## Regra de contribuição

Antes de publicar uma mudança, execute `npm run quality`. Falhas devem ser corrigidas na etapa responsável; não se deve remover uma verificação somente para permitir o commit.
