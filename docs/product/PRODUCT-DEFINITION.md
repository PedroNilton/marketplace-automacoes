# Definição do Produto — Marketplace de Automações

- **Versão:** 1.0.0
- **Status:** Aprovada para definição do MVP
- **Data:** 31 de julho de 2026
- **Mercado inicial:** Brasil
- **Idioma inicial:** Português do Brasil
- **Nome de trabalho:** Marketplace de Automações

## 1. Resumo

O Marketplace de Automações será uma plataforma digital que conectará pessoas e empresas interessadas em comprar automações a profissionais capazes de fornecê-las.

Vendedores poderão publicar automações prontas ou oferecer desenvolvimento personalizado. Compradores poderão pesquisar, comparar, contratar, acompanhar a entrega e avaliar o serviço realizado.

A plataforma atuará como intermediadora da relação, organizando descoberta, contratação, comunicação, entrega, reputação e, futuramente, pagamento e resolução de disputas.

## 2. Visão do produto

Ser o ambiente de referência no Brasil para encontrar, contratar e vender automações de forma clara, confiável e acessível.

## 3. Problema

Pequenos negócios e profissionais frequentemente identificam atividades repetitivas que poderiam ser automatizadas, mas enfrentam dificuldades para:

- Entender qual solução atende à necessidade.
- Encontrar profissionais especializados.
- Comparar preço, prazo e experiência.
- Avaliar a confiabilidade de uma oferta.
- Definir claramente o que será entregue.
- Acompanhar contratação, entrega e ajustes.

Profissionais de automação, por outro lado, enfrentam dificuldades para:

- Encontrar compradores qualificados.
- Apresentar seu trabalho de maneira estruturada.
- Demonstrar experiência e reputação.
- Padronizar escopo, preço e prazo.
- Centralizar comunicação e entrega.

## 4. Público-alvo inicial

### Compradores

- Pequenos negócios.
- Microempreendedores.
- Profissionais autônomos.
- Criadores e operadores digitais.
- Equipes pequenas com processos repetitivos.
- Pessoas buscando uma solução de automação específica.

### Vendedores

- Desenvolvedores de automação.
- Especialistas em integração de sistemas.
- Profissionais de ferramentas low-code e no-code.
- Desenvolvedores independentes.
- Pequenas agências de automação.
- Consultores de processos digitais.

## 5. Atores do sistema

### Visitante

Pessoa não autenticada que poderá conhecer a plataforma, explorar ofertas públicas e visualizar perfis e categorias.

### Usuário

Pessoa autenticada que possuirá uma única conta e poderá atuar como comprador, vendedor ou ambos, conforme as ações realizadas e os requisitos atendidos.

### Comprador

Usuário que pesquisa, compara e contrata uma automação.

### Vendedor

Usuário que mantém um perfil profissional, publica ofertas e realiza entregas.

### Administrador

Responsável por moderação, suporte operacional, denúncias, disputas e integridade da plataforma.

As personas detalhadas serão criadas em documento próprio depois da delimitação do MVP.

## 6. Proposta de valor

### Para o comprador

- Encontrar automações em um catálogo especializado.
- Comparar ofertas com informações padronizadas.
- Conhecer experiência e reputação do vendedor.
- Entender preço, prazo, requisitos e entregáveis antes da contratação.
- Centralizar pedido, comunicação, entrega e avaliação.

### Para o vendedor

- Expor conhecimento e portfólio para um público interessado.
- Transformar serviços em ofertas estruturadas.
- Vender soluções prontas ou projetos personalizados.
- Construir reputação por meio de pedidos concluídos.
- Organizar comunicação, prazo e entrega em um só fluxo.

### Para a plataforma

- Criar um ambiente especializado e confiável.
- Reduzir a incerteza entre comprador e vendedor.
- Padronizar etapas importantes da contratação.
- Gerar receita quando uma negociação for concluída dentro da plataforma.

## 7. Tipos de oferta

### Automação pronta

Solução já desenvolvida, com escopo previamente definido. A entrega poderá incluir arquivos, código, configuração, documentação ou instruções de instalação, conforme declarado na oferta.

### Automação personalizada

Serviço desenvolvido ou adaptado para a necessidade de um comprador, com requisitos, entregáveis, prazo e condições definidos antes do início do pedido.

### Fora da primeira versão

Assinaturas recorrentes, cobrança por consumo, licenciamento complexo e planos de manutenção contínua serão considerados em fases posteriores.

## 8. Categorias iniciais

- WhatsApp e chatbots.
- Inteligência artificial aplicada a processos.
- Planilhas e relatórios.
- Atendimento ao cliente.
- Vendas e CRM.
- Marketing e redes sociais.
- E-commerce.
- Integrações entre sistemas e APIs.
- Ferramentas low-code e no-code.
- Coleta e organização de dados permitidos.

A lista poderá ser ajustada depois de pesquisa com compradores e vendedores.

## 9. Jornada principal do produto

```text
Vendedor cria perfil
    → publica uma oferta
    → comprador encontra a oferta
    → consulta os detalhes
    → realiza um pedido
    → vendedor executa ou disponibiliza a solução
    → comprador recebe e avalia a entrega
    → pedido é concluído
    → comprador avalia o vendedor
```

Essa jornada orientará a delimitação do MVP e será dividida em fluxos menores antes da implementação.

## 10. Modelo de negócio

A fonte de receita inicial será uma comissão aplicada a pedidos concluídos dentro da plataforma.

Ainda não estão definidos:

- Percentual da comissão.
- Responsável por absorver a tarifa de pagamento.
- Prazo de liberação do valor ao vendedor.
- Regras financeiras de cancelamento e reembolso.
- Provedor de pagamento.

Essas decisões exigirão uma especificação financeira e um ADR próprio antes da integração com pagamentos.

## 11. Confiança e segurança

O produto deverá reduzir riscos para as duas partes por meio de:

- Perfis identificáveis.
- Descrições claras de ofertas.
- Requisitos e entregáveis registrados.
- Histórico do pedido.
- Avaliações vinculadas a pedidos concluídos.
- Denúncia de conteúdo e usuários.
- Moderação administrativa.
- Processo de cancelamento e disputa.

Não serão permitidas ofertas destinadas a fraude, invasão, roubo de credenciais, spam abusivo, violação de privacidade, contorno indevido de controles ou outras atividades ilegais.

Políticas detalhadas serão especificadas antes da abertura pública da plataforma.

## 12. Limites do produto inicial

### Incluído na direção do produto

- Contas de usuários.
- Perfis de compradores e vendedores.
- Catálogo de ofertas.
- Pesquisa e filtros.
- Pedidos.
- Comunicação vinculada ao pedido.
- Entregas.
- Avaliações.
- Moderação básica.
- Intermediação financeira, quando especificada.

### Não incluído inicialmente

- Aplicativo móvel nativo.
- Mercado internacional.
- Suporte a vários idiomas e moedas.
- Microserviços.
- Execução das automações dentro da própria plataforma.
- Hospedagem permanente das automações vendidas.
- Assinaturas e cobrança recorrente.
- Programa de afiliados.
- Recursos empresariais avançados.
- Inteligência artificial como requisito da própria plataforma.

## 13. Diferenciais pretendidos

- Foco exclusivo em automações.
- Linguagem adequada a compradores não técnicos.
- Ofertas com requisitos e entregáveis padronizados.
- Suporte a soluções prontas e personalizadas.
- Reputação baseada em transações reais.
- Organização do pedido do início à entrega.

Esses diferenciais são hipóteses de produto e deverão ser validados com usuários reais.

## 14. Indicadores iniciais de sucesso

O produto deverá acompanhar, no mínimo:

- Vendedores com perfil completo.
- Ofertas publicadas e aprovadas.
- Compradores que encontram uma oferta relevante.
- Pedidos iniciados.
- Pedidos concluídos.
- Tempo entre pedido e entrega.
- Taxa de cancelamento.
- Disputas abertas.
- Avaliação média após conclusão.
- Compradores e vendedores que retornam à plataforma.

Metas numéricas não serão inventadas nesta etapa. Elas serão definidas depois de uma linha de base ou de uma rodada inicial de validação.

## 15. Premissas a validar

- Pequenos negócios possuem demanda recorrente por automações.
- Compradores valorizam um catálogo especializado mais do que plataformas generalistas.
- Vendedores aceitarão padronizar suas ofertas.
- Reputação e clareza de escopo aumentarão a confiança.
- Há espaço para comissão sem inviabilizar a negociação.
- Compradores aceitarão manter contratação e comunicação dentro da plataforma.

Essas premissas deverão orientar entrevistas, protótipos e testes do MVP.

## 16. Riscos de produto

- Falta de compradores ou vendedores suficientes no lançamento.
- Negociação conduzida fora da plataforma.
- Escopos vagos gerando conflito sobre a entrega.
- Ofertas de baixa qualidade ou conteúdo malicioso.
- Fraude, chargeback e abuso do sistema de avaliações.
- Exposição indevida de credenciais ou dados fornecidos durante o pedido.
- Complexidade operacional de pagamentos, reembolsos e disputas.

Cada risco relevante deverá possuir medidas de prevenção, detecção e resposta nas especificações correspondentes.

## 17. Decisões consolidadas

- O mercado inicial será o Brasil.
- O idioma inicial será português do Brasil.
- O produto atenderá compradores e vendedores de automações.
- Uma conta poderá comprar e vender.
- Serão aceitas automações prontas e personalizadas.
- A plataforma buscará receita por comissão sobre pedidos concluídos.
- O produto começará como aplicação web responsiva.
- O MVP não executará nem hospedará permanentemente as automações vendidas.

## 18. Próxima etapa

O próximo artefato será `docs/product/MVP-SCOPE.md`, responsável por transformar esta definição em um primeiro recorte implementável, com:

- Capacidades obrigatórias.
- Funcionalidades adiadas.
- Critérios de entrada e saída do MVP.
- Primeira jornada vertical.
- Hipóteses que o MVP deverá validar.
