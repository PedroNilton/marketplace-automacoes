# Índice da Documentação

Este índice apresenta a autoridade, o propósito e a ordem de leitura dos artefatos do Marketplace de Automações.

## Ordem recomendada

1. [`CONSTITUTION.md`](CONSTITUTION.md)
2. [`product/PRODUCT-DEFINITION.md`](product/PRODUCT-DEFINITION.md)
3. [`product/MVP-SCOPE.md`](product/MVP-SCOPE.md)
4. [`product/PERSONAS.md`](product/PERSONAS.md)
5. [`product/USER-JOURNEYS.md`](product/USER-JOURNEYS.md)
6. [`domain/GLOSSARY.md`](domain/GLOSSARY.md)
7. [`domain/DOMAIN-MODEL.md`](domain/DOMAIN-MODEL.md)
8. [`domain/BUSINESS-RULES.md`](domain/BUSINESS-RULES.md)
9. [`ux/SCREEN-MAP.md`](ux/SCREEN-MAP.md)
10. [`product/REQUIREMENTS-CATALOG.md`](product/REQUIREMENTS-CATALOG.md)
11. [`architecture/ADR-001-stack-inicial.md`](architecture/ADR-001-stack-inicial.md)
12. [`SDD-ROADMAP.md`](SDD-ROADMAP.md)
13. [`development/LOCAL-INFRASTRUCTURE.md`](development/LOCAL-INFRASTRUCTURE.md)
14. [`development/ENVIRONMENT-CONFIGURATION.md`](development/ENVIRONMENT-CONFIGURATION.md)
15. [`development/QUALITY-COMMANDS.md`](development/QUALITY-COMMANDS.md)
16. [`development/PRISMA.md`](development/PRISMA.md)
17. [`development/DATABASE-MIGRATIONS.md`](development/DATABASE-MIGRATIONS.md)
18. [`../specs/README.md`](../specs/README.md)

## Artefatos por área

### Governança

| Documento | Estado | Autoridade |
|---|---|---|
| [`CONSTITUTION.md`](CONSTITUTION.md) | Ratificado | Princípios máximos do projeto |
| [`SDD-ROADMAP.md`](SDD-ROADMAP.md) | Ativo | Processo, gates, marcos e sequência |

### Produto

| Documento | Estado | Responde |
|---|---|---|
| [`product/PRODUCT-DEFINITION.md`](product/PRODUCT-DEFINITION.md) | Aprovado | Qual problema e para quem? |
| [`product/MVP-SCOPE.md`](product/MVP-SCOPE.md) | Aprovado | O que entra e o que não entra na beta? |
| [`product/PERSONAS.md`](product/PERSONAS.md) | Aprovado como hipótese | Quais necessidades orientam o produto? |
| [`product/USER-JOURNEYS.md`](product/USER-JOURNEYS.md) | Aprovado | Como cada ator percorre o MVP? |
| [`product/REQUIREMENTS-CATALOG.md`](product/REQUIREMENTS-CATALOG.md) | Aprovado | Quais resultados o sistema deve permitir? |

### Domínio

| Documento | Estado | Responde |
|---|---|---|
| [`domain/GLOSSARY.md`](domain/GLOSSARY.md) | Aprovado | O que cada termo significa? |
| [`domain/DOMAIN-MODEL.md`](domain/DOMAIN-MODEL.md) | Aprovado | Quais conceitos, relações e ciclos existem? |
| [`domain/BUSINESS-RULES.md`](domain/BUSINESS-RULES.md) | Catálogo aprovado | Quais regras e invariantes devem ser respeitadas? |

### Experiência

| Documento | Estado | Responde |
|---|---|---|
| [`ux/SCREEN-MAP.md`](ux/SCREEN-MAP.md) | Inventário aprovado | Quais telas e estados são necessários? |

Wireframes ainda não existem. Eles serão criados por fatia depois da aprovação da especificação correspondente.

### Arquitetura

| Documento | Estado | Decisão |
|---|---|---|
| [`architecture/ADR-001-stack-inicial.md`](architecture/ADR-001-stack-inicial.md) | Aceito | Next.js, NestJS, PostgreSQL, Prisma e monólito modular |
| [`architecture/ADR-002-autenticacao-e-sessoes.md`](architecture/ADR-002-autenticacao-e-sessoes.md) | Aceito | Sessões opacas, cookies protegidos, Argon2id e CSRF |

Novos ADRs serão criados somente quando outra decisão técnica duradoura for necessária.

### Desenvolvimento

| Documento | Estado | Finalidade |
|---|---|---|
| [`development/LOCAL-INFRASTRUCTURE.md`](development/LOCAL-INFRASTRUCTURE.md) | Ativo | Executar PostgreSQL e Mailpit localmente |
| [`development/ENVIRONMENT-CONFIGURATION.md`](development/ENVIRONMENT-CONFIGURATION.md) | Ativo | Configurar e validar o ambiente da API |
| [`development/QUALITY-COMMANDS.md`](development/QUALITY-COMMANDS.md) | Ativo | Executar formatação, lint, testes e build |
| [`development/PRISMA.md`](development/PRISMA.md) | Ativo | Gerar o Prisma Client e testar a conexão PostgreSQL |
| [`development/DATABASE-MIGRATIONS.md`](development/DATABASE-MIGRATIONS.md) | Ativo | Criar, aplicar e verificar migrations PostgreSQL |

### Especificações

Os artefatos funcionais residem em [`../specs/`](../specs/). Cada capacidade utiliza:

```text
spec.md → esclarecimento → plan.md → tasks.md → implementação → validação
```

Os modelos estão em [`../specs/templates/`](../specs/templates/).

## Hierarquia de autoridade

Em caso de conflito:

1. Constituição.
2. Especificação funcional aprovada.
3. ADR e contrato aprovados.
4. Plano técnico.
5. Tarefas.
6. Código e testes.

Documentos de produto e domínio sustentam as specs; qualquer mudança que amplie o MVP deve começar pelo escopo e pelo catálogo de requisitos.

## Estado resumido

- Fundação documental: concluída.
- Spec 001 — Identidade e acesso: em implementação.
- Código: fundação executável, persistência base, valores de e-mail/senha, relógio, tokens seguros, retorno interno e repositório de usuários concluídos.
- Próxima tarefa: `T-001-015` — implementar o `AuthTokenRepository`.
- Primeiro marco executável: identidade e acesso local.
- Primeira fatia vertical: perfil → oferta → moderação → catálogo.
- Beta: jornada completa sem pagamento interno.

## Manutenção

- Atualizar este índice ao criar, renomear ou substituir documento relevante.
- Manter links relativos válidos.
- Registrar data, versão e estado nos artefatos de autoridade.
- Não incluir segredos, dados reais de usuários ou credenciais na documentação.
