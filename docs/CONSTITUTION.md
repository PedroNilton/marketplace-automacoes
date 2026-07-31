# Constituição SDD — Marketplace de Automações

- **Versão:** 1.0.0
- **Status:** Ratificada
- **Ratificada em:** 31 de julho de 2026
- **Última alteração:** 31 de julho de 2026

## 1. Propósito

Esta Constituição define os princípios obrigatórios para especificar, planejar, implementar e validar o Marketplace de Automações.

O projeto seguirá **Spec-Driven Development (SDD)**. As especificações representarão a intenção e as regras do produto; planos, tarefas, código e testes deverão ser derivados delas e permanecer rastreáveis.

Esta Constituição prevalece sobre decisões informais, conveniências de implementação e sugestões que não estejam registradas nos artefatos do projeto.

## 2. Princípios fundamentais

### I. Especificação antes do código

Nenhuma funcionalidade poderá ser implementada antes de possuir uma especificação aprovada.

Toda especificação deverá declarar:

- Problema e objetivo.
- Atores envolvidos.
- Escopo incluído e excluído.
- Fluxo principal.
- Fluxos alternativos e falhas esperadas.
- Regras de negócio.
- Permissões e restrições.
- Dados envolvidos.
- Critérios de aceite verificáveis.
- Dependências e questões abertas.

Se o comportamento esperado não estiver claro, o trabalho deverá retornar à especificação, e não avançar por suposição no código.

### II. Simplicidade orientada ao MVP

Cada decisão deverá buscar a solução mais simples que satisfaça os requisitos aprovados.

- Não implementar possibilidades futuras sem requisito atual.
- Não adicionar serviços, bibliotecas ou abstrações sem necessidade demonstrada.
- Não criar microserviços no MVP.
- Preferir um fluxo completo e pequeno a vários fluxos incompletos.
- Adiar otimizações até existir evidência de que são necessárias.

Toda complexidade adicional deverá registrar o problema que resolve e por que uma alternativa mais simples não é suficiente.

### III. Monólito modular com limites claros

O backend será uma única aplicação NestJS, organizada por módulos de negócio.

- Cada módulo deverá ter responsabilidade definida.
- Regras de negócio não deverão depender de componentes de interface.
- Módulos não deverão acessar diretamente detalhes internos de outros módulos.
- Dependências entre módulos deverão ser explícitas.
- Separação em serviços independentes exigirá um novo ADR.

### IV. Backend como autoridade do sistema

O frontend poderá melhorar a experiência do usuário, mas nunca será considerado uma barreira de segurança.

O backend deverá:

- Revalidar toda entrada recebida.
- Autenticar o usuário quando necessário.
- Autorizar cada operação protegida.
- Aplicar regras de negócio independentemente do frontend.
- Evitar exposição de dados ou mensagens internas sensíveis.
- Registrar eventos relevantes para diagnóstico e auditoria.

### V. Segurança e privacidade por padrão

Toda especificação deverá considerar ameaças, abuso e acesso indevido proporcionais ao risco da funcionalidade.

- Senhas nunca serão armazenadas em texto puro.
- Segredos nunca serão incluídos no repositório.
- Arquivos `.env` reais não serão versionados.
- Cookies de autenticação deverão usar configurações seguras apropriadas ao ambiente.
- Dados pessoais coletados deverão possuir finalidade definida.
- Respostas da API deverão retornar somente os dados necessários.
- Operações sensíveis deverão considerar limitação de tentativas e rastreabilidade.

Dados de produção não poderão ser usados diretamente em desenvolvimento ou testes.

### VI. Banco de dados controlado por migrations

O PostgreSQL será a fonte persistente dos dados da aplicação, e o Prisma controlará a evolução do esquema.

- Toda alteração estrutural deverá possuir migration versionada.
- Alterações manuais no DBeaver não substituirão migrations.
- Migrations aplicadas não deverão ser reescritas de forma incompatível.
- Restrições importantes deverão existir também no banco quando aplicável.
- Operações destrutivas deverão possuir estratégia explícita de migração ou recuperação.

O DBeaver será usado para inspeção, consulta e diagnóstico, não como fonte da definição estrutural do banco.

### VII. Contratos explícitos de API

A comunicação entre Next.js e NestJS ocorrerá por API REST com contratos documentados.

- Endpoints deverão possuir entradas, respostas e erros definidos.
- A documentação OpenAPI deverá refletir o comportamento implementado.
- Mudanças incompatíveis deverão ser identificadas antes da implementação.
- O frontend não deverá depender de campos não declarados no contrato.
- Erros deverão usar um formato consistente e compreensível.

### VIII. Testes derivados dos critérios de aceite

Todo comportamento relevante deverá possuir uma forma objetiva de verificação.

- Regras de negócio críticas exigirão testes automatizados.
- Endpoints protegidos exigirão cenários de sucesso e acesso negado.
- O fluxo principal de cada entrega exigirá teste de integração ou ponta a ponta quando viável.
- Correções de defeitos deverão incluir um teste que demonstre o problema quando tecnicamente possível.
- Um teste não poderá contradizer a especificação; a divergência deverá ser resolvida na fonte correta.

Quantidade de testes não substituirá cobertura dos riscos e regras relevantes.

### IX. Experiência completa e acessível

Toda tela especificada deverá considerar:

- Estado inicial.
- Carregamento.
- Ausência de dados.
- Sucesso.
- Erro recuperável.
- Erro sem recuperação imediata.
- Acesso sem permissão.
- Uso em dispositivos móveis.
- Navegação e identificação compreensíveis.

Acessibilidade não será tratada como ajuste final. Componentes e fluxos deverão considerar semântica, teclado, foco, mensagens de erro e contraste desde a especificação.

### X. Rastreabilidade e documentação viva

Deverá ser possível relacionar:

```text
Objetivo do produto
    → especificação da funcionalidade
    → critérios de aceite
    → plano técnico
    → tarefas
    → código e migrations
    → testes
```

Quando uma regra mudar, a especificação deverá ser atualizada antes ou junto da implementação correspondente.

Decisões arquiteturais duradouras deverão ser registradas em ADRs. Comentários, conversas e mensagens não substituirão documentação versionada.

## 3. Processo obrigatório por funcionalidade

Cada funcionalidade passará pelas etapas abaixo.

### Etapa 1 — Especificar

Criar `spec.md` com intenção, escopo, regras, cenários e critérios de aceite, evitando decisões técnicas prematuras.

### Etapa 2 — Esclarecer

Resolver ambiguidades, conflitos e questões abertas que possam alterar comportamento, segurança, dados ou escopo.

### Etapa 3 — Planejar

Criar `plan.md` com arquitetura aplicável, contratos, modelo de dados, riscos, estratégia de testes e decisões técnicas.

### Etapa 4 — Decompor

Criar `tasks.md` com tarefas pequenas, ordenadas, verificáveis e vinculadas aos requisitos.

### Etapa 5 — Implementar

Executar somente as tarefas aprovadas. Descobertas que alterem o comportamento deverão retornar à especificação e ao plano.

### Etapa 6 — Validar

Executar testes e conferir a implementação contra todos os critérios de aceite antes de considerar a funcionalidade concluída.

## 4. Definition of Ready

Uma funcionalidade estará pronta para implementação somente quando:

- O objetivo estiver claro.
- Os atores estiverem identificados.
- O escopo incluído e excluído estiver registrado.
- As regras de negócio estiverem numeradas ou identificáveis.
- Os principais erros e exceções estiverem definidos.
- Os critérios de aceite forem verificáveis.
- Permissões e riscos de segurança estiverem analisados.
- Dados e contratos afetados estiverem planejados.
- Não houver questão aberta capaz de alterar significativamente a solução.
- O plano e as tarefas estiverem aprovados.

## 5. Definition of Done

Uma funcionalidade estará concluída somente quando:

- Os critérios de aceite estiverem satisfeitos.
- Os testes previstos estiverem passando.
- API e migrations estiverem sincronizadas com a documentação.
- Estados de interface previstos tiverem sido tratados.
- Não houver segredo ou dado sensível versionado.
- A documentação afetada estiver atualizada.
- A implementação não ampliar o escopo sem aprovação.
- O histórico do Git explicar claramente a mudança.

## 6. Hierarquia dos artefatos

Em caso de conflito, será usada a seguinte ordem de autoridade:

1. Constituição vigente.
2. Especificação aprovada da funcionalidade.
3. ADRs aceitos e contratos aprovados.
4. Plano técnico.
5. Lista de tarefas.
6. Implementação e testes.

Um artefato inferior não poderá alterar silenciosamente uma decisão de nível superior.

## 7. Governança

Alterações nesta Constituição deverão:

1. Explicar a necessidade da mudança.
2. Identificar documentos e funcionalidades afetados.
3. Ser revisadas antes de orientar novo código.
4. Atualizar a versão da Constituição.

O versionamento seguirá estas regras:

- **MAJOR:** remoção ou mudança incompatível de um princípio.
- **MINOR:** inclusão de princípio ou obrigação relevante.
- **PATCH:** esclarecimento sem mudança de intenção.

Exceções temporárias deverão ser documentadas, justificadas e possuir condição clara para encerramento.

## 8. Próxima etapa após a ratificação

Depois da aprovação desta Constituição, o próximo artefato será a definição do produto, contendo visão, problema, público, proposta de valor, personas e limites iniciais do MVP.
