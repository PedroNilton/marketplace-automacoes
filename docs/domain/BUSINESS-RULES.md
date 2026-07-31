# Regras de Negócio do MVP — Marketplace de Automações

- **Versão:** 1.0.0
- **Status:** Aprovado como catálogo inicial
- **Data:** 31 de julho de 2026
- **Documentos de origem:** Escopo, personas, jornadas, glossário e modelo de domínio

## 1. Finalidade

Este catálogo reúne regras transversais já aprovadas para o MVP. Cada regra possui um identificador estável para rastreamento em especificações, planos, tarefas, código e testes.

As especificações poderão detalhar condições e erros, mas não contrariar estas regras sem atualizar primeiro o documento de maior autoridade correspondente.

## 2. Convenções

- **MUST:** obrigatória no MVP.
- **MUST NOT:** comportamento proibido.
- **SHOULD:** esperado, salvo justificativa registrada.
- Regras marcadas como **abertas** ainda não autorizam implementação do ponto indefinido.

## 3. Identidade e acesso — `BR-IDA`

| ID | Regra |
|---|---|
| BR-IDA-001 | Cada conta MUST possuir um e-mail normalizado único entre contas utilizáveis. |
| BR-IDA-002 | A senha MUST ser armazenada exclusivamente como hash produzido por algoritmo apropriado; texto puro MUST NOT ser persistido ou registrado. |
| BR-IDA-003 | Cadastro, login, logout, verificação de e-mail e recuperação de senha MUST ser executados pelo backend. |
| BR-IDA-004 | Operações privadas MUST exigir autenticação válida. |
| BR-IDA-005 | Toda operação protegida MUST verificar autorização sobre o recurso específico, independentemente do frontend. |
| BR-IDA-006 | Uma conta MUST poder atuar como compradora e vendedora; o MVP MUST NOT exigir contas separadas. |
| BR-IDA-007 | A ativação do perfil profissional MUST NOT conceder permissão administrativa. |
| BR-IDA-008 | Uma conta suspensa MUST NOT iniciar ações protegidas de negócio. |
| BR-IDA-009 | Suspensão e reativação MUST registrar administrador, alvo, data e motivo. |
| BR-IDA-010 | Dados de autenticação, hashes, tokens e segredos MUST NOT ser retornados em perfis, telas administrativas ou logs de negócio. |
| BR-IDA-011 | A resposta de login ou recuperação SHOULD evitar revelar se um e-mail pertence a uma conta quando isso facilitar enumeração abusiva. |
| BR-IDA-012 | Operações sensíveis de autenticação MUST considerar limitação de tentativas na especificação técnica. |
| BR-IDA-013 | Uma sessão encerrada ou invalidada MUST NOT continuar autorizando novas operações. |
| BR-IDA-014 | O mecanismo exato de sessão e cookie permanece aberto até ADR próprio. |

## 4. Perfis — `BR-PER`

| ID | Regra |
|---|---|
| BR-PER-001 | Cada usuário MUST possuir no máximo um perfil básico e um perfil profissional no MVP. |
| BR-PER-002 | O titular MUST poder editar apenas os próprios perfis, salvo ação administrativa explicitamente autorizada. |
| BR-PER-003 | O perfil profissional MUST estar completo antes do envio da primeira oferta para análise. |
| BR-PER-004 | Perfil público MUST exibir somente informações profissionais aprovadas para divulgação. |
| BR-PER-005 | E-mail, credenciais e outros dados privados MUST NOT tornar-se públicos por ativação do perfil profissional. |
| BR-PER-006 | Links de portfólio MUST ser tratados como destinos externos e não como conteúdo garantido pela plataforma. |
| BR-PER-007 | Desativação ou suspensão de conta MUST tornar indisponíveis as ações de publicação e atendimento, preservando histórico necessário. |
| BR-PER-008 | Verificação de e-mail MUST NOT ser apresentada como verificação de identidade ou competência profissional. |

## 5. Categorias — `BR-CAT`

| ID | Regra |
|---|---|
| BR-CAT-001 | Cada oferta enviada à análise MUST possuir exatamente uma categoria principal ativa. |
| BR-CAT-002 | Categorias MUST ser administráveis por usuário autorizado. |
| BR-CAT-003 | Desativar uma categoria MUST NOT apagar ofertas ou pedidos históricos vinculados a ela. |
| BR-CAT-004 | Uma categoria inativa MUST NOT ser selecionável em nova oferta. |
| BR-CAT-005 | A lista inicial MAY ser cadastrada manualmente durante a preparação da beta. |

## 6. Ofertas — `BR-OFE`

| ID | Regra |
|---|---|
| BR-OFE-001 | Toda oferta MUST pertencer a exatamente um vendedor com conta ativa e perfil profissional permitido. |
| BR-OFE-002 | O MVP MUST aceitar os tipos `PRONTA` e `PERSONALIZADA`. |
| BR-OFE-003 | Uma oferta enviável MUST informar título, descrição, tipo, categoria, preço informativo, prazo estimado, requisitos e entregáveis. |
| BR-OFE-004 | Oferta MUST começar em `RASCUNHO`. |
| BR-OFE-005 | Somente o vendedor proprietário MUST poder editar o rascunho. |
| BR-OFE-006 | Enviar para análise MUST mudar a oferta para `PENDENTE_DE_ANALISE`. |
| BR-OFE-007 | Oferta pendente MUST NOT ser pública nem originar pedido. |
| BR-OFE-008 | Somente administrador autorizado MUST poder aprovar ou rejeitar oferta pendente. |
| BR-OFE-009 | Rejeição MUST incluir motivo compreensível e registrá-lo no histórico. |
| BR-OFE-010 | Oferta rejeitada MUST poder retornar a rascunho para correção pelo proprietário. |
| BR-OFE-011 | Somente oferta `APROVADA` e disponível MUST aparecer no catálogo e originar nova solicitação. |
| BR-OFE-012 | O vendedor proprietário MUST poder pausar uma oferta aprovada. |
| BR-OFE-013 | Oferta pausada MUST NOT originar nova solicitação, mas pedidos existentes MUST permanecer acessíveis. |
| BR-OFE-014 | Remoção administrativa MUST exigir motivo e preservar histórico. |
| BR-OFE-015 | Oferta removida MUST NOT voltar ao catálogo sem fluxo autorizado futuro. |
| BR-OFE-016 | Alterações em oferta pública MUST NOT alterar a cópia existente em pedidos anteriores. |
| BR-OFE-017 | Conteúdo da oferta MUST NOT solicitar senhas, tokens, chaves secretas ou credenciais em campos públicos. |
| BR-OFE-018 | Oferta destinada a fraude, invasão, roubo de credenciais, spam abusivo ou violação de privacidade MUST NOT ser aprovada. |
| BR-OFE-019 | Aprovação de oferta MUST NOT ser comunicada como certificação ou garantia absoluta da automação. |
| BR-OFE-020 | A regra de reanálise após alteração material de oferta aprovada permanece aberta para a especificação de ofertas. |
| BR-OFE-021 | Imagem principal permanece opcional e depende da decisão de armazenamento; sua ausência MUST NOT bloquear o fluxo textual do MVP. |

## 7. Catálogo e descoberta — `BR-DES`

| ID | Regra |
|---|---|
| BR-DES-001 | Catálogo público MUST listar somente ofertas aprovadas e disponíveis. |
| BR-DES-002 | Busca simples MUST considerar texto da oferta conforme contrato a definir, sem exigir busca semântica. |
| BR-DES-003 | O MVP MUST permitir filtro por categoria e tipo de oferta. |
| BR-DES-004 | Ordenação inicial MUST oferecer publicação recente; ranking patrocinado MUST NOT existir no MVP. |
| BR-DES-005 | Busca sem resultado MUST retornar estado vazio compreensível, não erro técnico. |
| BR-DES-006 | Página indisponível MUST NOT permitir criação de pedido. |
| BR-DES-007 | Preço MUST ser apresentado como informativo e sem sugerir processamento financeiro interno. |

## 8. Pedidos — `BR-PED`

| ID | Regra |
|---|---|
| BR-PED-001 | Pedido MUST ser criado somente a partir de oferta aprovada e disponível no instante da confirmação. |
| BR-PED-002 | A criação MUST identificar exatamente um comprador, um vendedor e uma oferta de origem. |
| BR-PED-003 | O comprador MUST NOT criar pedido para oferta própria no MVP. |
| BR-PED-004 | A criação MUST preservar cópia dos dados essenciais da oferta. |
| BR-PED-005 | Requisitos informados pelo comprador MUST permanecer privados aos participantes e ao suporte autorizado. |
| BR-PED-006 | Novo pedido MUST iniciar em `SOLICITADO`. |
| BR-PED-007 | Somente o vendedor responsável MUST poder aceitar ou recusar a solicitação. |
| BR-PED-008 | Recusa MUST exigir motivo e encerrar o fluxo sem apagar o pedido. |
| BR-PED-009 | Somente transições declaradas na máquina de estados MUST ser aceitas. |
| BR-PED-010 | Cada transição MUST verificar ator, estado atual e condições antes de persistir. |
| BR-PED-011 | Mudança de estado MUST registrar estado anterior, novo estado, autor e horário. |
| BR-PED-012 | Usuário não participante MUST NOT descobrir ou acessar detalhes privados do pedido. |
| BR-PED-013 | Comprador e vendedor de um pedido MUST NOT ser substituídos após a criação. |
| BR-PED-014 | Pausa ou remoção posterior da oferta MUST NOT apagar ou invalidar automaticamente pedido existente. |
| BR-PED-015 | Conclusão no MVP MUST ocorrer por aprovação explícita do comprador; conclusão automática não está autorizada. |
| BR-PED-016 | Cancelamento MUST ocorrer somente em estados e por atores definidos na especificação de pedidos. |
| BR-PED-017 | Cancelamento MUST exigir motivo e preservar o histórico anterior. |
| BR-PED-018 | Operações críticas MUST impedir duplicidade causada por reenvio da mesma ação. |
| BR-PED-019 | O MVP MUST NOT criar estados financeiros, cobrar, reter ou repassar valores. |
| BR-PED-020 | Política detalhada de prazo, cancelamento e disputa não financeira permanece aberta. |

## 9. Mensagens — `BR-MEN`

| ID | Regra |
|---|---|
| BR-MEN-001 | Toda mensagem MUST pertencer a um pedido existente. |
| BR-MEN-002 | Somente participante do pedido MUST poder criar mensagem, salvo capacidades administrativas futuras explicitamente aprovadas. |
| BR-MEN-003 | Mensagem MUST registrar autor e horário. |
| BR-MEN-004 | Histórico MUST ser apresentado em ordem cronológica estável. |
| BR-MEN-005 | Mensagens MUST ser privadas aos participantes e ao suporte autorizado. |
| BR-MEN-006 | O MVP MUST usar atualização simples; tempo real por WebSocket MUST NOT ser requisito. |
| BR-MEN-007 | Edição e exclusão de mensagens não estão aprovadas no MVP. |
| BR-MEN-008 | Mensagens MUST NOT alterar silenciosamente a cópia da oferta ou eventos do pedido. |

## 10. Entrega e revisão — `BR-ENT`

| ID | Regra |
|---|---|
| BR-ENT-001 | Somente vendedor responsável MUST poder registrar entrega. |
| BR-ENT-002 | Entrega MUST possuir mensagem e MAY possuir links externos. |
| BR-ENT-003 | Entrega MUST ser permitida apenas em estado compatível. |
| BR-ENT-004 | Registro da entrega e mudança para `ENTREGUE` MUST formar uma operação lógica atômica. |
| BR-ENT-005 | Cada entrega MUST permanecer identificável; nova entrega MUST NOT apagar anterior. |
| BR-ENT-006 | Somente comprador responsável MUST poder aprovar ou solicitar revisão. |
| BR-ENT-007 | Revisão MUST possuir justificativa e referenciar o contexto da entrega. |
| BR-ENT-008 | Revisão aceita pelo fluxo MUST permitir retorno a trabalho e posterior nova entrega. |
| BR-ENT-009 | Aprovação MUST mudar o pedido para `CONCLUIDO`. |
| BR-ENT-010 | Links MUST ser apresentados como externos; a plataforma MUST NOT alegar garantia sobre conteúdo não inspecionado. |
| BR-ENT-011 | Upload e hospedagem de arquivos MUST NOT ser implementados antes da decisão de armazenamento e segurança. |

## 11. Avaliações — `BR-AVA`

| ID | Regra |
|---|---|
| BR-AVA-001 | Somente comprador do pedido concluído MUST poder criar avaliação. |
| BR-AVA-002 | Cada pedido MUST possuir no máximo uma avaliação no MVP. |
| BR-AVA-003 | Nota MUST ser obrigatória; comentário MAY ser opcional. |
| BR-AVA-004 | Avaliação válida MUST aparecer no perfil público do vendedor. |
| BR-AVA-005 | Usuário MUST NOT avaliar oferta sem pedido concluído. |
| BR-AVA-006 | Administrador autorizado MUST poder remover avaliação abusiva com justificativa. |
| BR-AVA-007 | Remoção MUST ocultar conteúdo público e preservar a ação administrativa. |
| BR-AVA-008 | Resposta pública do vendedor e edição da avaliação MUST NOT fazer parte do MVP. |
| BR-AVA-009 | Escala, rótulos e cálculo da nota agregada permanecem abertos para a especificação de avaliações. |

## 12. Administração — `BR-ADM`

| ID | Regra |
|---|---|
| BR-ADM-001 | Área administrativa MUST exigir autenticação e permissão administrativa válida. |
| BR-ADM-002 | Permissão MUST ser revalidada no backend em cada operação administrativa. |
| BR-ADM-003 | Ações administrativas MUST registrar administrador, tipo, alvo e horário. |
| BR-ADM-004 | Rejeição, remoção, suspensão e remoção de avaliação MUST registrar motivo. |
| BR-ADM-005 | Ações de maior impacto MUST exigir confirmação com identificação clara do alvo. |
| BR-ADM-006 | Administrador MUST NOT editar silenciosamente oferta em nome do vendedor. |
| BR-ADM-007 | Administrador MUST NOT tornar-se participante do pedido por consultá-lo para suporte. |
| BR-ADM-008 | Acesso de suporte MUST ser limitado ao necessário e rastreável. |
| BR-ADM-009 | Ações administrativas MUST NOT apagar credenciais, histórico de pedido ou evidências necessárias sem política aprovada. |
| BR-ADM-010 | Administrador MUST NOT visualizar senha, hash, token ou segredo. |

## 13. Segurança, privacidade e confiabilidade — `BR-SEC`

| ID | Regra |
|---|---|
| BR-SEC-001 | Toda entrada externa MUST ser validada pelo backend. |
| BR-SEC-002 | Respostas MUST retornar somente os dados necessários ao ator autorizado. |
| BR-SEC-003 | Segredos e arquivos `.env` reais MUST NOT ser versionados. |
| BR-SEC-004 | Dados reais de produção MUST NOT ser usados diretamente em desenvolvimento ou testes. |
| BR-SEC-005 | Operação inválida MUST falhar sem deixar alteração parcial silenciosa. |
| BR-SEC-006 | Erros públicos MUST NOT expor stack trace, segredo ou detalhe interno sensível. |
| BR-SEC-007 | Ações críticas SHOULD produzir evento rastreável proporcional ao risco. |
| BR-SEC-008 | Dados pessoais MUST possuir finalidade e visibilidade definidas antes da coleta. |
| BR-SEC-009 | Links externos MUST receber tratamento seguro no frontend e validação de formato no backend. |
| BR-SEC-010 | Autorização MUST ser testada também em cenários de acesso negado e recurso de terceiro. |

## 14. Experiência e acessibilidade — `BR-UX`

| ID | Regra |
|---|---|
| BR-UX-001 | Fluxos principais MUST ser responsivos para navegador móvel e desktop. |
| BR-UX-002 | Tela com dados remotos MUST considerar carregamento, vazio, sucesso e erro. |
| BR-UX-003 | Ação protegida MUST considerar sessão ausente, expirada e acesso negado. |
| BR-UX-004 | Validação MUST identificar o campo e explicar como corrigir o erro. |
| BR-UX-005 | Ações destrutivas ou de alto impacto MUST solicitar confirmação proporcional. |
| BR-UX-006 | Navegação e formulários MUST utilizar semântica compreensível e operação básica por teclado. |
| BR-UX-007 | Estado atual e próximo passo de oferta e pedido MUST ser compreensíveis sem depender apenas de cor. |
| BR-UX-008 | Linguagem para compradores SHOULD apresentar benefício e resultado antes de detalhe técnico. |
| BR-UX-009 | Ausência de pagamento interno na beta MUST ser informada antes da solicitação de pedido. |

## 15. Regras abertas que bloqueiam apenas etapas posteriores

| Questão | Documento futuro | Bloqueia |
|---|---|---|
| Sessão, cookie e expiração | ADR de autenticação | Implementação de identidade |
| Serviço de e-mail | ADR ou plano de identidade | Verificação e recuperação reais |
| Reanálise de oferta editada | Spec 003/004 | Edição após aprovação |
| Cancelamento e prazos | Spec 006 | Fluxo completo de pedidos |
| Escala e cálculo da nota | Spec 008 | Avaliações |
| Armazenamento de imagens | ADR de armazenamento | Imagens reais |
| Canal e processo de denúncia | Spec 009/política | Operação da beta |
| Pagamentos e comissão | Especificação financeira e ADR | Lançamento comercial, não a beta sem pagamento |

## 16. Rastreabilidade

Toda especificação deverá listar as regras deste catálogo que implementa ou detalha. Critérios de aceite e testes deverão referenciar os respectivos IDs quando validarem uma regra crítica.

Exemplo:

```text
Requisito REQ-006
    → BR-PED-009 e BR-PED-010
    → AC-006-04
    → teste de transição inválida
```

## 17. Controle de mudanças

- Nova regra recebe novo ID; IDs publicados não devem ser reutilizados.
- Regra removida deve ser marcada como revogada em vez de desaparecer silenciosamente.
- Mudança que altera escopo exige atualização do `MVP-SCOPE.md`.
- Mudança arquitetural duradoura exige ADR.
- Detalhamento compatível pode ocorrer na especificação funcional correspondente.
