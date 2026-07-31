# Glossário do Domínio — Marketplace de Automações

- **Versão:** 1.0.0
- **Status:** Aprovado
- **Data:** 31 de julho de 2026
- **Escopo:** Vocabulário comum do produto e do MVP

## 1. Finalidade

Este glossário estabelece o significado dos termos usados em especificações, interface, API, código, testes e atendimento. Um mesmo conceito deverá conservar o mesmo nome em todos os artefatos, salvo quando uma tradução técnica for explicitamente necessária.

O glossário descreve conceitos de negócio, não tabelas de banco de dados.

## 2. Pessoas e papéis

### Visitante

Pessoa não autenticada. Pode acessar páginas públicas, navegar pelo catálogo e consultar ofertas e perfis públicos.

### Usuário

Pessoa com uma conta na plataforma. Uma mesma conta pode agir como comprador e vendedor.

### Comprador

Papel assumido pelo usuário ao criar uma solicitação de pedido a partir de uma oferta.

### Vendedor

Papel assumido pelo usuário que ativa um perfil profissional, publica ofertas e atende pedidos associados a elas.

### Administrador

Usuário com permissão operacional especial para moderação, suporte e proteção da beta. O papel não concede acesso irrestrito a todos os dados.

### Participante do pedido

Comprador ou vendedor diretamente associado a um pedido.

### Titular da conta

Pessoa à qual pertencem as credenciais e os dados pessoais da conta.

## 3. Identidade e acesso

### Conta

Registro que representa o acesso de uma pessoa à plataforma. Possui identidade, credenciais, estado e permissões.

### Perfil básico

Conjunto de informações gerais do usuário, como nome de exibição e imagem opcional.

### Perfil profissional

Informações públicas do vendedor, incluindo apresentação, competências, ferramentas e links de portfólio.

### Credencial

Informação usada para comprovar acesso, como senha. Credenciais nunca são conteúdo público e não devem ser solicitadas em ofertas.

### Sessão

Período autenticado reconhecido pelo backend. O mecanismo exato será definido em ADR próprio.

### Verificação de e-mail

Confirmação de que o usuário controla o endereço informado. Não equivale a verificação de identidade civil ou profissional.

### Autenticação

Processo que confirma quem está tentando acessar a plataforma.

### Autorização

Decisão sobre o que um usuário autenticado pode fazer em um recurso específico.

### Conta ativa

Conta autorizada a usar as capacidades compatíveis com seu perfil e suas permissões.

### Conta suspensa

Conta temporariamente impedida de realizar ações protegidas por decisão administrativa registrada.

### Conta desativada

Conta que deixou de estar disponível para uso conforme fluxo futuro de desativação. Desativação não significa apagamento imediato de todo histórico.

## 4. Catálogo e oferta

### Categoria

Classificação principal administrável usada para organizar e filtrar ofertas.

### Catálogo

Conjunto público de ofertas aprovadas e disponíveis para descoberta.

### Oferta

Apresentação estruturada de uma automação pronta ou personalizada publicada por um vendedor. Contém escopo, requisitos, entregáveis, prazo e preço informativo.

### Automação pronta

Oferta de solução já desenvolvida, com resultado e modo de entrega previamente delimitados.

### Automação personalizada

Oferta de serviço que será desenvolvido ou adaptado a partir dos requisitos do comprador.

### Escopo

Limite do trabalho prometido: o que está incluído, o que está excluído e quais condições afetam a entrega.

### Requisito do comprador

Informação, acesso autorizado, decisão ou material que o comprador deverá fornecer para viabilizar o pedido.

### Entregável

Resultado concreto prometido pelo vendedor, como código, configuração, documentação ou instrução disponibilizada conforme a oferta.

### Limitação

Condição que restringe o comportamento, a compatibilidade, o suporte ou a responsabilidade relacionada à oferta.

### Prazo estimado

Tempo informativo previsto para entrega. A regra sobre início da contagem será detalhada na especificação de pedidos.

### Preço informativo

Valor em reais apresentado para validar entendimento e interesse durante a beta. Não gera cobrança nem pagamento dentro da plataforma.

### Rascunho

Oferta ainda editável e não enviada à moderação.

### Oferta pendente de análise

Oferta enviada pelo vendedor e aguardando decisão administrativa. Não é pública.

### Oferta aprovada

Oferta aceita pela moderação e elegível para publicação no catálogo.

### Oferta rejeitada

Oferta não aprovada, acompanhada de motivo para correção ou encerramento.

### Oferta pausada

Oferta aprovada temporariamente indisponível para novas solicitações por decisão do vendedor.

### Oferta removida

Oferta retirada da publicação por decisão administrativa registrada. Remoção não apaga seu histórico.

### Moderação de oferta

Análise administrativa de clareza, classificação e conformidade com as diretrizes. Aprovação não constitui garantia absoluta de qualidade ou segurança da automação.

## 5. Pedido

### Solicitação de pedido

Ação do comprador que registra interesse em uma oferta e fornece os requisitos iniciais. Ao ser persistida, origina um pedido em estado `SOLICITADO`.

### Pedido

Registro privado que relaciona comprador, vendedor e uma cópia dos dados essenciais da oferta para conduzir solicitação, trabalho, mensagens, entrega, revisão e conclusão.

### Cópia da oferta

Retrato imutável dos dados relevantes da oferta no momento da solicitação. Protege o entendimento original contra alterações posteriores na oferta pública.

### Estado do pedido

Situação atual do pedido dentro de uma máquina de estados controlada. Apenas transições autorizadas podem alterá-lo.

### Pedido solicitado

Pedido criado pelo comprador e aguardando aceite ou recusa do vendedor.

### Pedido aceito

Solicitação aceita pelo vendedor, antes ou no momento em que o trabalho será iniciado conforme regra detalhada.

### Pedido em andamento

Pedido no qual o trabalho está sendo executado ou ajustado pelo vendedor.

### Pedido entregue

Pedido com uma entrega registrada e aguardando aprovação ou solicitação de revisão do comprador.

### Revisão solicitada

Estado que indica pedido de ajuste justificado pelo comprador após uma entrega.

### Pedido concluído

Pedido cuja entrega foi explicitamente aprovada pelo comprador. Habilita uma avaliação.

### Pedido cancelado

Pedido encerrado antes da conclusão por uma ação permitida e acompanhada de motivo.

### Recusa

Decisão do vendedor de não aceitar uma solicitação. Não é sinônimo de cancelamento de trabalho já iniciado.

### Cancelamento

Encerramento do pedido em estado permitido. A política detalhada ainda será especificada.

### Histórico do pedido

Sequência cronológica de eventos relevantes, como criação, aceite, mudança de estado, entrega, revisão e cancelamento.

## 6. Comunicação e entrega

### Mensagem do pedido

Texto privado criado por um participante e vinculado a um pedido, com autor e horário identificados.

### Conversa do pedido

Visualização cronológica das mensagens. No MVP, não é um chat em tempo real.

### Entrega

Registro criado pelo vendedor com mensagem obrigatória e links externos opcionais que apresenta o resultado do trabalho ao comprador.

### Link externo de entrega

Endereço informado pelo vendedor para acesso a material fora da plataforma. O MVP não hospeda nem garante o conteúdo desse destino.

### Solicitação de revisão

Pedido justificado do comprador para que o vendedor ajuste uma entrega. Não apaga a entrega anterior.

### Nova entrega

Entrega posterior registrada após uma revisão. Cada versão permanece identificável no histórico.

### Aprovação da entrega

Ação explícita do comprador que aceita o resultado e conclui o pedido.

## 7. Reputação e administração

### Avaliação

Nota e comentário opcional criados pelo comprador após um pedido concluído. Existe no máximo uma avaliação por pedido no MVP.

### Nota

Valor simples que resume a percepção do comprador. A escala será definida na especificação de avaliações.

### Comentário de avaliação

Texto público opcional associado à nota, sujeito à moderação.

### Denúncia

Comunicação de possível violação ou risco em conteúdo, conta ou interação. O canal e o fluxo detalhado serão especificados antes da beta.

### Ação administrativa

Decisão executada por administrador, como aprovar oferta, suspender conta ou remover avaliação, com alvo, autor, data e justificativa quando aplicável.

### Trilha de auditoria

Histórico protegido de eventos relevantes para explicar ações administrativas e mudanças críticas. Não é uma ferramenta pública de acompanhamento.

### Suporte autorizado

Acesso administrativo limitado ao contexto necessário para investigar uma solicitação ou proteger a plataforma.

## 8. Termos técnicos do projeto

### MVP

Menor versão capaz de validar a jornada de oferta, descoberta, pedido, entrega e avaliação em uma beta controlada.

### Beta controlada

Uso inicial por grupo pequeno e acompanhado, sem processamento de pagamentos pela plataforma.

### SDD

Spec-Driven Development: processo no qual comportamento e critérios de aceite são especificados antes do plano, das tarefas e do código.

### Especificação

Documento aprovado que define objetivo, escopo, atores, regras, fluxos, exceções e critérios de aceite de uma capacidade.

### Critério de aceite

Condição objetiva e verificável que demonstra se um requisito foi atendido.

### ADR

Architecture Decision Record: registro de uma decisão técnica duradoura, seu contexto e suas consequências.

### Monólito modular

Uma única aplicação backend dividida internamente por módulos de negócio com responsabilidades e dependências explícitas.

### API REST

Contrato HTTP pelo qual o frontend solicita operações ao backend.

### Migration

Alteração versionada do esquema do PostgreSQL aplicada por meio do Prisma.

### DBeaver

Ferramenta de inspeção e consulta do PostgreSQL. Não é banco de dados, backend ou substituto de migrations.

## 9. Termos que não devem ser confundidos

| Termo | Não significa |
|---|---|
| Oferta | Pedido ou contrato já aceito |
| Preço informativo | Cobrança processada pela plataforma |
| Oferta aprovada | Automação certificada ou garantida |
| E-mail verificado | Identidade civil verificada |
| Mensagem do pedido | Chat público ou em tempo real |
| Entrega | Execução da automação dentro da plataforma |
| Pausa | Remoção administrativa |
| Recusa | Cancelamento depois do início do trabalho |
| Perfil profissional | Conta separada de vendedor |
| Administrador | Acesso ilimitado e sem auditoria |
| DBeaver | PostgreSQL ou ORM |

## 10. Convenções de linguagem

- Na interface, usar termos compreensíveis em português do Brasil.
- Em textos para compradores, priorizar o problema resolvido antes da tecnologia.
- Não usar “produto” como sinônimo de oferta quando isso puder confundir com o próprio marketplace.
- Não usar “pagamento”, “compra concluída” ou “valor recebido” no MVP como se houvesse transação financeira interna.
- Estados técnicos podem usar identificadores em maiúsculas nas especificações; a interface deverá exibir rótulos naturais.
- Novos termos de negócio deverão ser incluídos aqui antes de serem usados de maneiras conflitantes.

## 11. Questões terminológicas adiadas

- Nome comercial da plataforma.
- Escala e rótulos da nota de avaliação.
- Termos financeiros de comissão, saldo, repasse, reembolso e disputa.
- Nome final do processo de denúncia e recurso.
- Vocabulário para planos, adicionais ou licenças futuras.

Esses termos serão definidos apenas quando suas capacidades entrarem em escopo.
