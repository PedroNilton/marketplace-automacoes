# Tarefas da Spec [NNN] — [Nome da capacidade]

- **Versão:** 0.1.0
- **Status:** Proposta
- **Spec:** `specs/[pasta]/spec.md`
- **Plano:** `specs/[pasta]/plan.md`
- **Data:** [data]

## 1. Regras de execução

- Executar na ordem das dependências.
- Não iniciar tarefa bloqueada.
- Cada tarefa deve produzir resultado verificável.
- Descoberta que altere comportamento retorna à spec e ao plano.
- Marcar como concluída somente após executar sua validação.

## 2. Legenda

- `[ ]` pendente.
- `[-]` em andamento.
- `[x]` concluída e validada.
- `[!]` bloqueada, com motivo documentado.
- `P` pode executar em paralelo com outras tarefas de mesma fase.

## 3. Fase A — Fundação e contratos

- [ ] **T-NNN-001 — [Resultado]**
  - Referências: [RF], [BR], [AC].
  - Dependências: nenhuma.
  - Arquivos previstos: [caminhos].
  - Ação: [mudança pequena e concreta].
  - Validação: [comando ou evidência].

## 4. Fase B — Banco e backend

- [ ] **T-NNN-002 — [Migration e modelo]**
  - Referências: [RF], [BR], [AC].
  - Dependências: T-NNN-001.
  - Arquivos previstos: [caminhos].
  - Ação: [mudança].
  - Validação: [teste/migration].

- [ ] **T-NNN-003 — [Regra ou caso de uso]**
  - Referências: [RF], [BR], [AC].
  - Dependências: T-NNN-002.
  - Arquivos previstos: [caminhos].
  - Ação: [mudança].
  - Validação: [teste unitário].

- [ ] **T-NNN-004 — [Endpoint]**
  - Referências: [RF], [BR], [AC].
  - Dependências: T-NNN-003.
  - Arquivos previstos: [caminhos].
  - Ação: [mudança].
  - Validação: [teste de integração/OpenAPI].

## 5. Fase C — Frontend

- [ ] **T-NNN-005 — [Tela/fluxo]**
  - Referências: [tela], [AC].
  - Dependências: T-NNN-004.
  - Arquivos previstos: [caminhos].
  - Ação: [mudança].
  - Estados: inicial, carregamento, erro, sucesso, acesso negado.
  - Validação: [teste de componente/E2E].

## 6. Fase D — Validação integrada

- [ ] **T-NNN-006 — [Cenário ponta a ponta]**
  - Referências: [jornada], [AC].
  - Dependências: tarefas de backend e frontend.
  - Ação: [cenário completo].
  - Validação: [comando e resultado esperado].

- [ ] **T-NNN-007 — [Segurança e acesso negado]**
  - Referências: [RNF-SEC], [AC].
  - Dependências: tarefas funcionais.
  - Ação: [cenários de abuso, terceiro e repetição].
  - Validação: [testes].

## 7. Fase E — Documentação e encerramento

- [ ] **T-NNN-008 — Sincronizar documentação**
  - Atualizar OpenAPI, ADR, glossário ou regras afetadas.
  - Validar links e ausência de segredo.

- [ ] **T-NNN-009 — Verificar Definition of Done**
  - Conferir todos os critérios de aceite.
  - Executar a suíte prevista.
  - Registrar limitações conhecidas compatíveis com a spec.

## 8. Matriz de cobertura

| Critério | Tarefas | Teste/evidência | Estado |
|---|---|---|---|
| [AC-NNN-01] | [T-NNN-...] | [teste] | Pendente |

## 9. Bloqueios e desvios

| Data | Tarefa | Bloqueio ou desvio | Impacto | Decisão |
|---|---|---|---|---|
| [data] | [ID] | [descrição] | [impacto] | [ação] |

## 10. Checklist antes da implementação

- [ ] Spec aprovada.
- [ ] Plano aprovado.
- [ ] ADRs necessários aceitos.
- [ ] Tarefas cobrem todos os critérios.
- [ ] Dependências estão explícitas.
- [ ] Comandos de validação são executáveis.
- [ ] Nenhuma questão bloqueante permanece aberta.
