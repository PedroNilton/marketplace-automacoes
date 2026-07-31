# Catálogo de Requisitos do MVP — Marketplace de Automações

- **Versão:** 1.0.0
- **Status:** Aprovado
- **Data:** 31 de julho de 2026
- **Base:** Definição do produto, escopo, jornadas, regras de negócio e mapa de telas

## 1. Finalidade

Este catálogo transforma o escopo do MVP em requisitos identificáveis e rastreáveis. Ele declara **o que** a beta precisa permitir; comportamento detalhado e critérios de aceite serão definidos nas especificações funcionais.

## 2. Prioridades

| Prioridade | Significado |
|---|---|
| `MUST` | Necessário para a beta ou para segurança e integridade |
| `SHOULD` | Importante, mas pode receber simplificação justificada |
| `COULD` | Opcional, somente se não comprometer o fluxo obrigatório |
| `WONT` | Explicitamente fora do MVP |

Nenhum requisito `COULD` deve atrasar um `MUST`.

## 3. Objetivos rastreáveis

| ID | Objetivo |
|---|---|
| OBJ-01 | Permitir que vendedor transforme serviço de automação em oferta estruturada e moderada |
| OBJ-02 | Permitir que comprador encontre e compreenda uma oferta relevante |
| OBJ-03 | Conduzir solicitação, comunicação, entrega, revisão e conclusão com histórico |
| OBJ-04 | Produzir reputação ligada a pedido realmente concluído |
| OBJ-05 | Operar a beta com segurança, moderação e rastreabilidade mínimas |
| OBJ-06 | Validar o fluxo sem processar pagamentos ou hospedar automações |

## 4. Requisitos funcionais

### 4.1 Identidade e acesso — `RF-IDA`

| ID | Prioridade | Requisito |
|---|---|---|
| RF-IDA-001 | MUST | Visitante deve poder criar conta com nome, e-mail e senha. |
| RF-IDA-002 | MUST | Usuário deve poder verificar o controle do e-mail. |
| RF-IDA-003 | MUST | Usuário com conta permitida deve poder entrar e encerrar sessão. |
| RF-IDA-004 | MUST | Usuário deve poder solicitar e concluir recuperação de senha com autorização válida. |
| RF-IDA-005 | MUST | A mesma conta deve poder comprar e vender. |
| RF-IDA-006 | MUST | O sistema deve aplicar estados ativa, suspensa e desativada conforme regras. |
| RF-IDA-007 | MUST | Áreas privadas e administrativas devem exigir autorização apropriada. |

### 4.2 Perfis — `RF-PER`

| ID | Prioridade | Requisito |
|---|---|---|
| RF-PER-001 | MUST | Usuário deve poder consultar e editar o próprio perfil básico. |
| RF-PER-002 | MUST | Usuário deve poder ativar e completar perfil profissional. |
| RF-PER-003 | MUST | Perfil profissional deve aceitar descrição, competências, ferramentas e links de portfólio. |
| RF-PER-004 | MUST | Visitante deve poder consultar perfil público do vendedor sem dados privados. |
| RF-PER-005 | COULD | Perfil e oferta podem exibir imagem após aprovação da solução de armazenamento. |

### 4.3 Categorias e ofertas — `RF-OFE`

| ID | Prioridade | Requisito |
|---|---|---|
| RF-OFE-001 | MUST | Administrador deve poder manter categorias utilizáveis pelo catálogo. |
| RF-OFE-002 | MUST | Vendedor deve poder criar e salvar oferta em rascunho. |
| RF-OFE-003 | MUST | Oferta deve registrar tipo, categoria, descrição, escopo, requisitos, entregáveis, prazo e preço informativo. |
| RF-OFE-004 | MUST | Vendedor deve poder revisar e enviar oferta para moderação. |
| RF-OFE-005 | MUST | Oferta pendente deve ficar indisponível ao público. |
| RF-OFE-006 | MUST | Administrador deve poder aprovar ou rejeitar oferta, com motivo na rejeição. |
| RF-OFE-007 | MUST | Vendedor deve poder corrigir oferta rejeitada. |
| RF-OFE-008 | MUST | Oferta aprovada e disponível deve ser publicada no catálogo. |
| RF-OFE-009 | MUST | Vendedor deve poder pausar oferta aprovada. |
| RF-OFE-010 | MUST | Administrador deve poder remover oferta com justificativa. |

### 4.4 Catálogo e descoberta — `RF-DES`

| ID | Prioridade | Requisito |
|---|---|---|
| RF-DES-001 | MUST | Visitante deve poder listar ofertas aprovadas e disponíveis. |
| RF-DES-002 | MUST | Visitante deve poder pesquisar ofertas por texto. |
| RF-DES-003 | MUST | Visitante deve poder filtrar por categoria e tipo. |
| RF-DES-004 | MUST | Visitante deve poder ordenar por publicação recente. |
| RF-DES-005 | MUST | Visitante deve poder consultar detalhes completos da oferta e o vendedor. |
| RF-DES-006 | MUST | O sistema deve explicar busca sem resultado e oferta indisponível. |

### 4.5 Pedidos — `RF-PED`

| ID | Prioridade | Requisito |
|---|---|---|
| RF-PED-001 | MUST | Comprador autenticado deve poder solicitar oferta disponível e informar requisitos. |
| RF-PED-002 | MUST | O pedido deve preservar dados essenciais da oferta no momento da solicitação. |
| RF-PED-003 | MUST | Vendedor responsável deve poder aceitar ou recusar a solicitação. |
| RF-PED-004 | MUST | Participante deve poder consultar seus pedidos e estado atual. |
| RF-PED-005 | MUST | O sistema deve aceitar apenas transições válidas e autorizadas. |
| RF-PED-006 | MUST | Mudanças relevantes devem permanecer no histórico. |
| RF-PED-007 | MUST | Participante autorizado deve poder cancelar somente quando a política permitir e com motivo. |
| RF-PED-008 | MUST | Pedido deve ser privado ao comprador, vendedor e suporte autorizado. |

### 4.6 Comunicação, entrega e revisão — `RF-ENT`

| ID | Prioridade | Requisito |
|---|---|---|
| RF-ENT-001 | MUST | Participantes devem poder enviar mensagens de texto vinculadas ao pedido. |
| RF-ENT-002 | MUST | Conversa deve identificar autor, horário e ordem cronológica. |
| RF-ENT-003 | MUST | Vendedor deve poder registrar entrega com mensagem e links externos opcionais. |
| RF-ENT-004 | MUST | Comprador deve poder solicitar revisão com justificativa. |
| RF-ENT-005 | MUST | Vendedor deve poder registrar nova entrega sem apagar versões anteriores. |
| RF-ENT-006 | MUST | Comprador deve poder aprovar entrega explicitamente e concluir o pedido. |
| RF-ENT-007 | MUST | O sistema deve avisar que links de entrega levam a conteúdo externo. |

### 4.7 Avaliações — `RF-AVA`

| ID | Prioridade | Requisito |
|---|---|---|
| RF-AVA-001 | MUST | Comprador deve poder avaliar uma vez cada pedido concluído. |
| RF-AVA-002 | MUST | Avaliação deve possuir nota e aceitar comentário opcional. |
| RF-AVA-003 | MUST | Avaliação válida deve aparecer no perfil do vendedor. |
| RF-AVA-004 | MUST | Usuário sem pedido concluído deve ser impedido de avaliar. |
| RF-AVA-005 | MUST | Administrador deve poder remover avaliação abusiva com justificativa. |

### 4.8 Administração — `RF-ADM`

| ID | Prioridade | Requisito |
|---|---|---|
| RF-ADM-001 | MUST | Administrador deve acessar área separada e protegida. |
| RF-ADM-002 | MUST | Administrador deve consultar e decidir ofertas pendentes. |
| RF-ADM-003 | MUST | Administrador deve localizar usuários e suspender ou reativar conta com motivo. |
| RF-ADM-004 | MUST | Administrador autorizado deve consultar pedido para suporte sem tornar-se participante. |
| RF-ADM-005 | MUST | Administrador deve moderar avaliações abusivas. |
| RF-ADM-006 | MUST | Sistema deve registrar ações administrativas relevantes. |
| RF-ADM-007 | SHOULD | Filas administrativas devem aceitar filtros simples por estado. |

### 4.9 Institucional e operação — `RF-INS`

| ID | Prioridade | Requisito |
|---|---|---|
| RF-INS-001 | MUST | Plataforma deve explicar sua proposta e funcionamento. |
| RF-INS-002 | MUST | Plataforma deve publicar diretrizes de ofertas permitidas. |
| RF-INS-003 | MUST | Plataforma deve disponibilizar termos e política de privacidade adequados à beta. |
| RF-INS-004 | MUST | Plataforma deve oferecer canal mínimo de contato e denúncia. |
| RF-INS-005 | MUST | Plataforma deve informar claramente que não processa pagamentos na beta. |

## 5. Requisitos não funcionais

### 5.1 Segurança — `RNF-SEC`

| ID | Requisito verificável |
|---|---|
| RNF-SEC-001 | Backend deve validar entradas e autorização de toda operação protegida. |
| RNF-SEC-002 | Testes devem demonstrar negação de acesso a recurso de terceiro nos fluxos privados. |
| RNF-SEC-003 | Senhas, tokens e segredos não podem aparecer em respostas, logs de negócio ou repositório. |
| RNF-SEC-004 | Operações de autenticação sensíveis devem possuir proteção proporcional contra abuso. |
| RNF-SEC-005 | Erros externos não devem expor detalhes internos sensíveis. |

### 5.2 Privacidade — `RNF-PRI`

| ID | Requisito verificável |
|---|---|
| RNF-PRI-001 | Cada dado pessoal coletado deve ter finalidade e visibilidade definidas. |
| RNF-PRI-002 | Perfil público não deve expor e-mail ou dados privados da conta. |
| RNF-PRI-003 | Ambiente de desenvolvimento e testes não deve usar dados reais de produção. |
| RNF-PRI-004 | Acesso administrativo a pedido deve ser limitado e rastreável. |

### 5.3 Confiabilidade e consistência — `RNF-CON`

| ID | Requisito verificável |
|---|---|
| RNF-CON-001 | Transição inválida deve ser rejeitada sem alteração parcial. |
| RNF-CON-002 | Operação crítica repetida não deve criar efeitos duplicados. |
| RNF-CON-003 | Entrega e mudança de estado devem permanecer consistentes mesmo em falha. |
| RNF-CON-004 | Alterações estruturais do PostgreSQL devem ocorrer por migrations versionadas. |
| RNF-CON-005 | Histórico relevante não deve desaparecer por mudança posterior de estado. |

### 5.4 Experiência e acessibilidade — `RNF-UX`

| ID | Requisito verificável |
|---|---|
| RNF-UX-001 | Fluxos principais devem funcionar em navegadores móveis e desktop suportados. |
| RNF-UX-002 | Telas remotas devem tratar carregamento, vazio, sucesso e erro. |
| RNF-UX-003 | Formulários devem identificar erros e orientar correção. |
| RNF-UX-004 | Ações essenciais devem ser utilizáveis por teclado e possuir estrutura semântica. |
| RNF-UX-005 | Estado e erro não devem depender somente de cor. |
| RNF-UX-006 | Ações de alto impacto devem exibir alvo e pedir confirmação adequada. |

### 5.5 API e manutenção — `RNF-API`

| ID | Requisito verificável |
|---|---|
| RNF-API-001 | Contratos REST devem definir entrada, saída e erros e permanecer refletidos no OpenAPI. |
| RNF-API-002 | Erros da API devem seguir formato consistente. |
| RNF-API-003 | Frontend não deve depender de campo ausente do contrato aprovado. |
| RNF-API-004 | Módulos do backend devem manter limites e dependências explícitos. |
| RNF-API-005 | Critérios de aceite críticos devem originar testes automatizados. |

### 5.6 Desempenho e operação — `RNF-OPE`

| ID | Requisito verificável |
|---|---|
| RNF-OPE-001 | Metas numéricas de desempenho devem ser definidas antes da beta com base no ambiente escolhido; não devem ser inventadas nesta etapa. |
| RNF-OPE-002 | Aplicação deve produzir logs suficientes para diagnosticar falhas sem registrar segredos. |
| RNF-OPE-003 | Falhas críticas conhecidas devem ser tratadas antes da liberação da beta. |
| RNF-OPE-004 | Execução acompanhada da jornada vertical deve ser registrada antes da abertura da beta. |

## 6. Matriz de rastreabilidade resumida

| Objetivo | Jornadas | Grupos de requisitos | Especificações previstas |
|---|---|---|---|
| OBJ-01 | J-03, J-05 | RF-PER, RF-OFE, RF-ADM | 002, 003, 004 |
| OBJ-02 | J-01 | RF-DES, RF-PER, RF-OFE | 005 |
| OBJ-03 | J-02, J-04 | RF-PED, RF-ENT | 006, 007 |
| OBJ-04 | J-02 | RF-AVA | 008 |
| OBJ-05 | J-05, J-06 | RF-ADM e todos os RNFs | 001 a 009 |
| OBJ-06 | Todas | RF-INS-005, exclusões | Todas |

## 7. Exclusões obrigatórias — `WONT`

- Pagamento, comissão, retenção, repasse, reembolso e chargeback.
- Armazenamento próprio de arquivos de entrega.
- Execução ou hospedagem da automação pela plataforma.
- Aplicativo móvel nativo.
- Login social.
- Chat em tempo real, voz ou vídeo.
- Assinaturas, pacotes, adicionais, cupons e afiliados.
- Favoritos, recomendação por IA, busca semântica e ranking patrocinado.
- Múltiplos idiomas e moedas.
- Microserviços, filas e cache distribuído sem novo requisito e ADR.

## 8. Critério de cobertura

Antes de uma especificação ser considerada pronta:

1. Todo requisito em seu escopo deve possuir pelo menos um critério de aceite.
2. Toda regra de negócio relevante deve estar referenciada.
3. Toda tela afetada deve estar identificada.
4. Cada requisito excluído ou adiado deve permanecer explicitamente fora do plano.
5. Questões abertas capazes de mudar comportamento não podem ser decididas apenas no código.

## 9. Controle de mudanças

- IDs publicados não devem ser reutilizados com outro significado.
- Requisito removido deve ser marcado como revogado e justificar a mudança.
- Novo `MUST` que amplie produto exige revisão do escopo do MVP.
- Metas numéricas só entram quando houver decisão explícita e forma de medição.
- Este catálogo deve ser atualizado junto de mudanças aprovadas nas especificações.
