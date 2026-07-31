# Especificações SDD

Esta pasta conterá uma subpasta numerada para cada capacidade do MVP.

## Estrutura

```text
specs/
├── README.md
├── templates/
│   ├── spec-template.md
│   ├── plan-template.md
│   └── tasks-template.md
├── 001-identidade-acesso/
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
└── ...
```

## Ordem dos artefatos

1. `spec.md`: comportamento, regras e critérios de aceite, sem decisões técnicas prematuras.
2. Esclarecimento: resolução das questões capazes de alterar o comportamento.
3. `plan.md`: arquitetura, contratos, dados, segurança e testes.
4. `tasks.md`: decomposição ordenada e verificável.
5. Implementação e validação.

## Estados de uma especificação

| Estado | Significado |
|---|---|
| Proposta | Rascunho em elaboração |
| Em esclarecimento | Possui questões comportamentais a resolver |
| Aprovada | Comportamento autorizado para planejamento |
| Planejada | Plano e decisões técnicas aprovados |
| Pronta para implementação | Tarefas aprovadas e Definition of Ready satisfeita |
| Implementada | Código concluído, aguardando ou passando validação |
| Concluída | Definition of Done satisfeita |
| Substituída | Outra versão ou spec assumiu sua autoridade |

## Regras

- Copiar os templates; não editar o template para representar uma funcionalidade específica.
- Manter IDs estáveis para requisitos, regras, critérios e tarefas.
- Referenciar documentos de produto e domínio por caminho.
- Não usar a spec para decidir framework, biblioteca ou estrutura física de tabela.
- Não usar o plano para alterar comportamento aprovado.
- Não iniciar tarefa de código antes dos gates descritos em `docs/SDD-ROADMAP.md`.
- Atualizar primeiro o artefato de maior autoridade quando houver divergência.

## Sequência do MVP

| Ordem | Capacidade | Estado documental |
|---:|---|---|
| 001 | Identidade e acesso | Spec, ADR, plano e tarefas aprovados |
| 002 | Perfis | Próxima especificação |
| 003 | Categorias e ofertas | Aguardando |
| 004 | Moderação de ofertas | Aguardando |
| 005 | Catálogo e descoberta | Aguardando |
| 006 | Pedidos | Aguardando |
| 007 | Mensagens e entrega | Aguardando |
| 008 | Avaliações | Aguardando |
| 009 | Administração básica | Aguardando |
