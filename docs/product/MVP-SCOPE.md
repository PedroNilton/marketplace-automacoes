# Escopo do MVP — Marketplace de Automações

- **Versão:** 1.0.0
- **Status:** Aprovado
- **Aprovado em:** 31 de julho de 2026
- **Data:** 31 de julho de 2026
- **Tipo de lançamento:** Beta controlada
- **Documento de origem:** `docs/product/PRODUCT-DEFINITION.md`

## 1. Objetivo do MVP

O MVP deverá validar se compradores conseguem encontrar uma automação relevante e conduzir um pedido até a entrega, enquanto vendedores conseguem estruturar, publicar e entregar uma oferta dentro da plataforma.

O objetivo não é lançar uma Fiverr completa. O objetivo é testar a menor jornada que conecte os dois lados do marketplace e produza aprendizado real sobre demanda, clareza das ofertas, confiança e conclusão de pedidos.

## 2. Hipóteses que o MVP deverá validar

- Vendedores conseguem transformar seus serviços em ofertas padronizadas.
- Compradores entendem as ofertas sem depender de conhecimento técnico avançado.
- Categoria, busca simples e filtros básicos são suficientes para encontrar uma oferta relevante.
- Requisitos e entregáveis claros reduzem dúvidas e conflitos.
- Comprador e vendedor aceitam manter o histórico do pedido dentro da plataforma.
- Uma avaliação vinculada a um pedido concluído ajuda a construir confiança.

A comissão e o comportamento de pagamento não serão validados neste recorte, pois exigem uma etapa financeira própria.

## 3. Natureza da primeira versão

O MVP será uma **beta controlada**, acessível inicialmente a um grupo pequeno de usuários convidados ou acompanhados.

Nesta fase:

- Não haverá movimentação de dinheiro pela plataforma.
- Preços terão caráter informativo para validar entendimento e interesse.
- A plataforma deixará claro que não processa pagamentos nesta versão.
- Pedidos serão usados para validar escopo, comunicação, entrega e avaliação.
- A operação poderá receber acompanhamento manual do administrador.

Um lançamento comercial exigirá especificação de pagamentos, reembolsos, repasses, disputas e responsabilidades antes de ser autorizado.

## 4. Jornada vertical obrigatória

```text
Vendedor cria conta
    → completa perfil profissional
    → cria e envia uma oferta para análise
    → administrador aprova a oferta
    → comprador encontra e consulta a oferta
    → comprador cria uma solicitação de pedido
    → vendedor aceita e inicia o trabalho
    → comprador e vendedor trocam mensagens no pedido
    → vendedor registra uma entrega
    → comprador aprova a entrega
    → pedido é concluído
    → comprador avalia o vendedor
```

O MVP só será considerado funcional quando essa jornada puder ser executada do início ao fim.

## 5. Capacidades obrigatórias

### 5.1 Identidade e acesso

- Cadastro com nome, e-mail e senha.
- Login e encerramento de sessão.
- Verificação de e-mail.
- Recuperação de senha.
- Uma única conta capaz de comprar e vender.
- Estado de conta ativa, suspensa ou desativada.
- Área autenticada para ações privadas.

Os detalhes de sessão, cookies, hash de senha e proteção contra abuso serão definidos na especificação de identidade.

### 5.2 Perfil do usuário e do vendedor

- Perfil básico com nome e imagem opcional.
- Ativação do perfil profissional de vendedor.
- Descrição profissional.
- Competências e ferramentas utilizadas.
- Portfólio por links externos.
- Exibição pública do perfil do vendedor.
- Edição dos próprios dados permitidos.

Verificação documental e selos avançados não fazem parte do MVP.

### 5.3 Categorias

- Lista administrável de categorias.
- Associação de uma oferta a uma categoria principal.
- Navegação do catálogo por categoria.

Categorias iniciais poderão ser cadastradas manualmente pelo administrador.

### 5.4 Ofertas

- Criação de oferta pelo vendedor.
- Título e descrição.
- Tipo: pronta ou personalizada.
- Categoria.
- Preço informativo em reais.
- Prazo estimado.
- Requisitos que o comprador deverá fornecer.
- Entregáveis prometidos.
- Imagem principal opcional.
- Edição enquanto estiver em rascunho ou devolvida para ajustes.
- Envio para moderação.
- Aprovação ou rejeição com motivo.
- Pausa pelo vendedor.
- Visualização pública somente após aprovação.

Pacotes, adicionais, descontos e cobrança recorrente ficam fora do MVP.

### 5.5 Catálogo e descoberta

- Página pública de ofertas aprovadas.
- Busca simples por texto.
- Filtro por categoria.
- Filtro por tipo de oferta.
- Ordenação básica por publicação recente.
- Página de detalhes da oferta.
- Acesso ao perfil público do vendedor.
- Estados claros para busca sem resultado e oferta indisponível.

Recomendação personalizada, busca semântica e ranking patrocinado ficam fora do MVP.

### 5.6 Pedidos

- Criação de solicitação a partir de uma oferta aprovada.
- Registro dos requisitos enviados pelo comprador.
- Cópia dos principais dados da oferta no momento do pedido.
- Aceitação ou recusa pelo vendedor.
- Acompanhamento do estado do pedido.
- Cancelamento com motivo nos estados permitidos.
- Histórico das mudanças relevantes.
- Visualização restrita ao comprador, vendedor e administrador.

### 5.7 Comunicação

- Mensagens de texto vinculadas ao pedido.
- Identificação do autor e horário.
- Histórico em ordem cronológica.
- Acesso somente aos participantes e ao administrador autorizado.
- Atualização por recarregamento ou consulta periódica simples.

Chat em tempo real, chamadas e mensagens fora de pedidos ficam fora do MVP.

### 5.8 Entrega e revisão

- Registro de uma entrega pelo vendedor.
- Mensagem de entrega obrigatória.
- Links externos de entrega opcionais.
- Solicitação de uma revisão pelo comprador com justificativa.
- Nova entrega após revisão.
- Aprovação da entrega pelo comprador.
- Conclusão do pedido após aprovação.

Upload e hospedagem de arquivos pela plataforma serão definidos depois da escolha de armazenamento. O MVP usará texto e links externos, com avisos de segurança apropriados.

### 5.9 Avaliações

- Uma avaliação por comprador em cada pedido concluído.
- Nota simples.
- Comentário opcional.
- Exibição pública no perfil do vendedor.
- Impossibilidade de avaliar sem pedido concluído.
- Moderação administrativa em caso de abuso.

Respostas públicas do vendedor e critérios avançados de reputação ficam fora do MVP.

### 5.10 Administração e moderação

- Acesso exclusivo de administrador.
- Listagem de usuários.
- Suspensão e reativação de conta com motivo.
- Análise de ofertas pendentes.
- Aprovação, rejeição e remoção de oferta.
- Visualização de pedidos para suporte autorizado.
- Remoção de avaliação abusiva com justificativa.
- Registro das ações administrativas relevantes.

Não haverá painel analítico avançado na primeira versão.

### 5.11 Páginas institucionais mínimas

- Apresentação da plataforma.
- Como funciona.
- Diretrizes de ofertas permitidas.
- Termos de uso em versão adequada à beta.
- Política de privacidade em versão adequada à beta.
- Canal para contato e denúncia.

Os textos jurídicos deverão ser revisados antes de usuários reais fornecerem dados à plataforma.

## 6. Estados principais

### Oferta

```text
RASCUNHO
    → PENDENTE_DE_ANALISE
    → APROVADA
    → PAUSADA

PENDENTE_DE_ANALISE
    → REJEITADA
    → RASCUNHO após correção

APROVADA ou PAUSADA
    → REMOVIDA por moderação
```

### Pedido

```text
SOLICITADO
    → ACEITO
    → EM_ANDAMENTO
    → ENTREGUE
    → CONCLUIDO

ENTREGUE
    → REVISAO_SOLICITADA
    → EM_ANDAMENTO
    → ENTREGUE

SOLICITADO ou ACEITO
    → CANCELADO, conforme regra aplicável
```

As transições definitivas e as permissões de cada estado serão detalhadas na especificação de pedidos.

## 7. Dados centrais previstos

- Usuário.
- Sessão ou credencial de acesso.
- Perfil.
- Perfil de vendedor.
- Categoria.
- Oferta.
- Histórico de moderação da oferta.
- Pedido.
- Histórico de estados do pedido.
- Mensagem do pedido.
- Entrega.
- Solicitação de revisão.
- Avaliação.
- Ação administrativa.

Este documento não define tabelas. O modelo de domínio e o plano técnico definirão relações e persistência posteriormente.

## 8. Requisitos não funcionais essenciais

### Segurança

- O backend revalidará todas as operações.
- Endpoints privados exigirão autenticação e autorização.
- Usuários não poderão acessar pedidos de terceiros.
- Segredos não serão versionados.
- Ações administrativas relevantes serão rastreáveis.

### Privacidade

- Somente dados necessários serão coletados.
- Dados privados não serão exibidos em perfis públicos.
- Ambientes de teste não usarão dados reais de produção.

### Experiência

- Interface web responsiva.
- Estados de carregamento, vazio, erro e acesso negado.
- Formulários com mensagens de validação compreensíveis.
- Navegação básica por teclado e estrutura semântica.

### Confiabilidade

- Transições de estado deverão impedir combinações inválidas.
- Operações críticas deverão evitar duplicidade causada por reenvio.
- Erros não deverão deixar pedido ou oferta em estado parcial silencioso.

## 9. Fora do MVP

- Pagamento, retenção de valores e repasse ao vendedor.
- Comissão aplicada de fato.
- Reembolso e chargeback.
- Disputa financeira automatizada.
- Assinaturas e planos pagos.
- Aplicativos móveis nativos.
- Vários idiomas e moedas.
- Login social.
- Chat em tempo real por WebSocket.
- Videochamadas e chamadas de voz.
- Hospedagem e execução das automações.
- Armazenamento próprio de arquivos de entrega.
- Pacotes e adicionais de oferta.
- Cupons e promoções.
- Favoritos.
- Recomendação por inteligência artificial.
- Busca semântica.
- Programa de afiliados.
- Painel analítico avançado.
- Microserviços, filas e cache distribuído.

Itens fora do MVP só poderão entrar mediante alteração aprovada deste documento.

## 10. Critérios de saída do MVP

O MVP estará pronto para uma beta controlada quando:

- A jornada vertical obrigatória funcionar de ponta a ponta.
- Todos os critérios de aceite das especificações incluídas estiverem satisfeitos.
- Usuários não conseguirem acessar dados privados de terceiros nos testes previstos.
- Estados inválidos de oferta e pedido forem rejeitados.
- Houver moderação mínima para ofertas, contas e avaliações.
- A interface tratar carregamento, vazio, erro e acesso negado nos fluxos principais.
- Os testes automatizados definidos nos planos estiverem passando.
- Não houver defeito crítico conhecido sem tratamento.
- Termos, privacidade e comunicação sobre ausência de pagamento estiverem visíveis.
- Uma execução acompanhada com vendedor e comprador de teste for concluída e documentada.

## 11. Indicadores da beta

Durante a beta, serão observados:

- Percentual de vendedores que concluem o perfil.
- Percentual de ofertas enviadas que conseguem ser aprovadas.
- Buscas que resultam em visualização de uma oferta.
- Visualizações de oferta que geram solicitação de pedido.
- Solicitações aceitas pelo vendedor.
- Pedidos que chegam a uma entrega.
- Entregas aprovadas ou devolvidas para revisão.
- Pedidos concluídos e cancelados.
- Tempo e principais obstáculos em cada etapa.
- Feedback qualitativo de compradores e vendedores.

Metas numéricas serão definidas depois da primeira rodada acompanhada.

## 12. Sequência de especificações

| Ordem | Especificação | Resultado principal |
|---|---|---|
| 001 | Identidade e acesso | Usuário cria conta e entra com segurança |
| 002 | Perfis | Usuário cria seu perfil e ativa perfil profissional |
| 003 | Categorias e ofertas | Vendedor estrutura e envia uma oferta |
| 004 | Moderação de ofertas | Administrador aprova uma oferta para publicação |
| 005 | Catálogo e descoberta | Comprador encontra e consulta uma oferta |
| 006 | Pedidos | Comprador solicita e vendedor conduz um pedido |
| 007 | Mensagens e entrega | Participantes se comunicam e registram a entrega |
| 008 | Avaliações | Comprador avalia um pedido concluído |
| 009 | Administração básica | Administrador protege a integridade da beta |

Cada item seguirá o ciclo `spec.md → plan.md → tasks.md → implementação → validação`.

## 13. Primeira fatia implementável

A primeira fatia vertical será menor do que o MVP completo:

```text
Vendedor cria conta
    → completa perfil
    → cria uma oferta
    → administrador aprova
    → visitante visualiza a oferta publicada
```

Essa fatia provará a fundação de identidade, autorização, perfis, ofertas, moderação, API, banco e interface antes da inclusão de pedidos.

## 14. Decisões adiadas

- Provedor e fluxo de pagamentos.
- Percentual de comissão.
- Regras de reembolso e disputa financeira.
- Serviço de armazenamento de arquivos.
- Serviço de e-mail transacional.
- Metas numéricas da beta.
- Critérios de convite e quantidade de participantes.
- Política detalhada de cancelamento.

Essas decisões não impedem a especificação da primeira fatia vertical.

## 15. Próxima etapa após aprovação

Depois da aprovação deste escopo, serão criadas as personas essenciais e as jornadas detalhadas do comprador, vendedor e administrador. Em seguida será produzido o mapa de telas, antes da primeira especificação funcional.
