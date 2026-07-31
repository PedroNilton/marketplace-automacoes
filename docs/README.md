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
13. [`../specs/README.md`](../specs/README.md)

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

Novos ADRs serão criados quando uma decisão técnica duradoura for necessária, começando pela autenticação no plano da Spec 001.

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
- Código: ainda não iniciado.
- Próxima entrega: `specs/001-identidade-acesso/spec.md`.
- Primeiro marco executável: identidade e acesso local.
- Primeira fatia vertical: perfil → oferta → moderação → catálogo.
- Beta: jornada completa sem pagamento interno.

## Manutenção

- Atualizar este índice ao criar, renomear ou substituir documento relevante.
- Manter links relativos válidos.
- Registrar data, versão e estado nos artefatos de autoridade.
- Não incluir segredos, dados reais de usuários ou credenciais na documentação.
