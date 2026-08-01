# Marketplace de Automações

Marketplace brasileiro para conectar compradores que desejam automatizar processos a vendedores especializados em automações, integrações e soluções low-code, no-code ou desenvolvidas sob medida.

## Estado do projeto

O projeto iniciou a **implementação da Spec 001 — Identidade e acesso** e segue **Spec-Driven Development (SDD)**: comportamento, regras, arquitetura, critérios de aceite e tarefas são definidos antes do código.

O workspace inicial já contém aplicações executáveis mínimas em Next.js e NestJS. Os próximos incrementos implementarão os comportamentos aprovados da Spec 001 em pequenas entregas testadas.

PostgreSQL e Mailpit já podem ser executados localmente com Docker Compose. As instruções estão em [`docs/development/LOCAL-INFRASTRUCTURE.md`](docs/development/LOCAL-INFRASTRUCTURE.md).

A configuração tipada da API e o preparo do `.env` estão documentados em [`docs/development/ENVIRONMENT-CONFIGURATION.md`](docs/development/ENVIRONMENT-CONFIGURATION.md).

## Objetivo do MVP

Validar, em uma beta controlada, a menor jornada completa entre os dois lados do marketplace:

```text
vendedor cria perfil e oferta
    → administrador aprova
    → comprador encontra e solicita
    → vendedor aceita e entrega
    → comprador aprova e avalia
```

A beta não processará pagamentos. Preços serão informativos até existir uma especificação financeira própria.

## Stack inicial

- Frontend: Next.js, React, TypeScript e Tailwind CSS.
- Backend: NestJS e TypeScript.
- Comunicação: API REST documentada com OpenAPI.
- Banco: PostgreSQL.
- ORM e migrations: Prisma.
- Administração local do banco: DBeaver.
- Arquitetura: monólito modular com frontend e backend separados no mesmo repositório.

A decisão completa está em [`docs/architecture/ADR-001-stack-inicial.md`](docs/architecture/ADR-001-stack-inicial.md).

## Documentação principal

- [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md) — princípios obrigatórios do projeto.
- [`docs/product/PRODUCT-DEFINITION.md`](docs/product/PRODUCT-DEFINITION.md) — visão e proposta de valor.
- [`docs/product/MVP-SCOPE.md`](docs/product/MVP-SCOPE.md) — capacidades incluídas e excluídas.
- [`docs/product/PERSONAS.md`](docs/product/PERSONAS.md) — personas provisórias.
- [`docs/product/USER-JOURNEYS.md`](docs/product/USER-JOURNEYS.md) — jornadas detalhadas.
- [`docs/domain/GLOSSARY.md`](docs/domain/GLOSSARY.md) — vocabulário do domínio.
- [`docs/domain/DOMAIN-MODEL.md`](docs/domain/DOMAIN-MODEL.md) — conceitos, relações e estados.
- [`docs/domain/BUSINESS-RULES.md`](docs/domain/BUSINESS-RULES.md) — regras numeradas.
- [`docs/ux/SCREEN-MAP.md`](docs/ux/SCREEN-MAP.md) — mapa funcional de telas.
- [`docs/product/REQUIREMENTS-CATALOG.md`](docs/product/REQUIREMENTS-CATALOG.md) — requisitos rastreáveis.
- [`docs/SDD-ROADMAP.md`](docs/SDD-ROADMAP.md) — roteiro até a beta.
- [`specs/README.md`](specs/README.md) — processo das especificações.
- [`specs/001-identidade-acesso/`](specs/001-identidade-acesso/) — primeira capacidade pronta para implementação.

O índice completo está em [`docs/README.md`](docs/README.md).

## Estrutura atual

```text
marketplace-automacoes/
├── backend/       # API NestJS
├── frontend/      # Aplicação Next.js
├── docs/          # Produto, domínio, UX e arquitetura
├── specs/         # spec.md, plan.md e tasks.md por capacidade
├── compose.yaml   # PostgreSQL e Mailpit locais
└── README.md
```

## Princípio de contribuição

Uma funcionalidade só avança para código quando possuir:

1. Especificação aprovada.
2. Questões comportamentais resolvidas.
3. Plano técnico aprovado.
4. Tarefas rastreáveis.
5. Critérios de aceite e estratégia de testes.

Mudanças devem preservar o escopo da beta e manter documentação, contratos, migrations, código e testes sincronizados.

## Próximo passo

Consolidar e validar os comandos de qualidade da tarefa `T-001-006`, mantendo a sequência aprovada da Spec 001.
