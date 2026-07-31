# Spec [NNN] — [Nome da capacidade]

- **Versão:** 0.1.0
- **Status:** Proposta
- **Data:** [data]
- **Responsável:** [responsável]
- **Marco:** [M1–M5]

## 1. Problema

[Descrever o problema do usuário e por que precisa ser resolvido agora.]

## 2. Objetivo

[Declarar o resultado observável esperado, sem escolher tecnologia.]

## 3. Atores

| Ator | Interesse | Permissão relevante |
|---|---|---|
| [ator] | [interesse] | [permissão] |

## 4. Pré-condições

- [Condição verdadeira antes do fluxo.]

## 5. Escopo incluído

- [Capacidade incluída.]

## 6. Escopo excluído

- [Capacidade explicitamente adiada ou proibida.]

## 7. Requisitos e regras relacionadas

| Referência | Aplicação nesta spec |
|---|---|
| [RF-...] | [como participa] |
| [BR-...] | [como participa] |
| [RNF-...] | [como participa] |

## 8. Fluxo principal

1. [Ator inicia a ação.]
2. [Sistema valida condições.]
3. [Sistema produz resultado.]

## 9. Fluxos alternativos e falhas

### F-01 — [Nome]

1. **Dado que** [contexto].
2. **Quando** [ação ou falha].
3. **Então** [resultado seguro e observável].

## 10. Regras específicas

| ID | Regra |
|---|---|
| SPEC-NNN-R01 | [Regra compatível com o catálogo de domínio.] |

## 11. Estados e transições

| Estado atual | Ação | Ator | Próximo estado | Condição |
|---|---|---|---|---|
| [estado] | [ação] | [ator] | [estado] | [condição] |

Remover esta seção quando a capacidade não possuir ciclo de vida.

## 12. Dados envolvidos

| Informação | Origem | Visibilidade | Obrigatória | Observação |
|---|---|---|---:|---|
| [dado] | [ator/sistema] | [pública/privada] | Sim | [finalidade] |

Não definir tabela, coluna ou tipo físico nesta seção.

## 13. Permissões

| Operação | Visitante | Usuário | Proprietário/participante | Administrador |
|---|---:|---:|---:|---:|
| [operação] | Não | Não | Sim | [conforme regra] |

## 14. Estados de interface

- Inicial.
- Carregando ou enviando.
- Vazio, quando aplicável.
- Sucesso.
- Erro de validação.
- Erro recuperável.
- Acesso negado.
- Sessão expirada.

## 15. Critérios de aceite

### AC-NNN-01 — [Resultado]

- **Dado que** [contexto inicial].
- **Quando** [ação].
- **Então** [resultado verificável].
- **E** [efeito adicional, se necessário].

### AC-NNN-02 — Acesso negado

- **Dado que** [ator sem permissão].
- **Quando** [tenta acessar ou alterar].
- **Então** [operação é negada sem exposição indevida].

## 16. Evidências e métricas

- [Evento ou indicador necessário para validar a hipótese.]

## 17. Riscos e abusos

| Risco | Impacto | Tratamento esperado na spec |
|---|---|---|
| [risco] | [impacto] | [prevenção/detecção/recuperação] |

## 18. Dependências

- [Spec, política ou decisão anterior.]

## 19. Questões abertas

| ID | Questão | Impacto | Responsável | Estado |
|---|---|---|---|---|
| Q-NNN-01 | [questão] | [o que muda] | [responsável] | Aberta |

Uma spec não pode ser aprovada enquanto questão capaz de mudar significativamente o comportamento permanecer aberta.

## 20. Checklist de aprovação

- [ ] Problema e objetivo estão claros.
- [ ] Atores e permissões estão identificados.
- [ ] Escopo incluído e excluído estão explícitos.
- [ ] Requisitos e regras possuem referências.
- [ ] Fluxos de sucesso, falha e abuso estão cobertos.
- [ ] Dados e visibilidade estão definidos conceitualmente.
- [ ] Critérios de aceite são verificáveis.
- [ ] Questões bloqueantes foram resolvidas.
- [ ] A spec não contém decisões técnicas prematuras.
