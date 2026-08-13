# Tarefas da Spec 001 — Identidade e Acesso

- **Versão:** 1.0.0
- **Status:** Aprovado — pronto para implementação
- **Data:** 31 de julho de 2026
- **Spec:** `specs/001-identidade-acesso/spec.md`
- **Plano:** `specs/001-identidade-acesso/plan.md`
- **ADR:** `docs/architecture/ADR-002-autenticacao-e-sessoes.md`

## 1. Regras de execução

- Executar na ordem das dependências.
- Não iniciar tarefa bloqueada.
- Adicionar o teste mais próximo do comportamento junto da implementação correspondente.
- Não usar `git add -A` quando houver mudanças alheias ao escopo.
- Descoberta que altere comportamento retorna à spec e ao plano.
- Versões de dependências serão registradas no lockfile e verificadas contra fontes oficiais no momento do scaffold.
- Nenhuma tarefa inclui perfil profissional, oferta, pedido, pagamento ou administração de contas.

## 2. Legenda

- `[ ]` pendente.
- `[-]` em andamento.
- `[x]` concluída e validada.
- `[!]` bloqueada, com motivo na seção de desvios.
- `P` indica que a tarefa pode executar em paralelo com outra da mesma fase depois das dependências.

## 3. Fase A — Fundação do repositório

### T-001-001 — Preparar workspace Node.js

- [x] Criar `package.json` privado na raiz com workspaces `frontend` e `backend` e versão suportada do Node.js.
- Referências: ADR-001, princípio de simplicidade.
- Dependências: nenhuma.
- Resultado: um lockfile único e scripts raiz para lint, teste, build e desenvolvimento.
- Validação: instalação limpa termina sem erro e nenhum segredo é criado.

### T-001-002 — Criar aplicação NestJS mínima

- [x] Gerar `backend/` com TypeScript estrito e sem funcionalidade de exemplo desnecessária.
- Referências: ADR-001, plano §3.
- Dependências: T-001-001.
- Resultado: API inicia localmente e responde somente a verificação técnica de saúde mínima.
- Validação: lint, testes iniciais e build do backend passam.

### T-001-003 — Criar aplicação Next.js mínima `P`

- [x] Gerar `frontend/` com App Router, TypeScript e Tailwind, removendo conteúdo demonstrativo.
- Referências: ADR-001, telas AUT.
- Dependências: T-001-001.
- Resultado: aplicação web inicia com layout mínimo e nenhuma regra de identidade simulada.
- Validação: lint e build do frontend passam.

### T-001-004 — Preparar infraestrutura local `P`

- [x] Definir ambiente local reproduzível para PostgreSQL e Mailpit, com volumes e portas explicitamente nomeados.
- Referências: plano §§12 e 23.
- Dependências: T-001-001.
- Resultado: banco e capturador SMTP iniciam sem usar serviço BaaS.
- Validação: conexão ao PostgreSQL e interface/API do Mailpit respondem localmente.

### T-001-005 — Definir configuração e exemplos de ambiente

- [x] Criar validação tipada de configuração para API, banco, cookie, origens, SMTP, HMAC e tempos.
- Referências: ADR-002, plano §11, BR-SEC-003.
- Dependências: T-001-002, T-001-004.
- Resultado: `.env.example` contém somente nomes e valores não secretos; configuração inválida impede inicialização.
- Validação: teste inicia com configuração válida e falha de forma clara sem segredo obrigatório.

### T-001-006 — Consolidar comandos de qualidade

- [x] Configurar formatação, lint, testes e build executáveis na raiz.
- Referências: Constituição, Definition of Done.
- Dependências: T-001-002, T-001-003.
- Resultado: comandos separados por workspace e comando agregado.
- Validação: todos os comandos passam no scaffold limpo.

## 4. Fase B — PostgreSQL e Prisma

### T-001-007 — Configurar Prisma no backend

- [x] Adicionar Prisma, conexão PostgreSQL e geração do cliente sem criar acesso a banco no frontend.
- Referências: ADR-001, BR-SEC-001, RNF-CON-004.
- Dependências: T-001-004, T-001-005.
- Resultado: cliente é injetável na infraestrutura do backend.
- Validação: geração do cliente e conexão de teste passam.

### T-001-008 — Criar migration inicial de identidade

- [x] Modelar `users`, `sessions`, `auth_tokens` e `auth_rate_limits` com enums, FKs, unicidade, índices e timestamps do plano.
- Referências: plano §9, BR-IDA-001/002/013.
- Dependências: T-001-007.
- Resultado: migration versionada, sem alteração manual pelo DBeaver.
- Validação: migration aplica em banco vazio, schema é validado e reversão de ambiente descartável é ensaiada.

### T-001-009 — Implementar repositório Prisma base

- [x] Encapsular transações e mapeamento de erros conhecidos, inclusive violação de e-mail único.
- Referências: AC-001-01/02, plano §10.
- Dependências: T-001-008.
- Resultado: casos de uso não importam tipos Prisma diretamente.
- Validação: testes de integração comprovam commit, rollback e conflito de unicidade.

## 5. Fase C — Domínio, políticas e adaptadores

### T-001-010 — Implementar normalização e valor de e-mail

- [x] Centralizar trim, normalização aprovada, validação de comprimento/formato e comparação.
- Referências: BR-IDA-001, AC-001-02.
- Dependências: T-001-002.
- Resultado: cadastro, login, reenvio e recuperação usam a mesma política.
- Validação: testes unitários cobrem caixa, espaços, inválidos e limite.

### T-001-011 — Implementar política e hash de senha `P`

- [x] Aplicar 15–128 caracteres, Unicode, confirmação, blocklist local e Argon2id configurável.
- Referências: SPEC-001-R01 a R05, AC-001-03/04, ADR-002.
- Dependências: T-001-005.
- Resultado: senha nunca é truncada nem enviada para consulta externa.
- Validação: unitários cobrem limites e blocklist; integração verifica hash e login sem expor valor.

### T-001-012 — Implementar relógio e tokens seguros `P`

- [x] Criar abstrações de tempo, gerador CSPRNG, digest e comparação segura.
- Referências: AC-001-05/06/15/16, ADR-002.
- Dependências: T-001-005.
- Resultado: tokens de sessão e e-mail possuem 256 bits e valores brutos não são persistidos.
- Validação: relógio falso controla expiração; testes confirmam formato, digest e ausência em logs.

### T-001-013 — Implementar validação de retorno interno `P`

- [x] Aceitar apenas caminho interno relativo da aplicação e fornecer fallback seguro.
- Referências: AC-001-12, risco de open redirect.
- Dependências: T-001-002.
- Resultado: URLs absolutas, esquemas, caminhos ambíguos e destinos não permitidos são rejeitados.
- Validação: tabela de testes com caminhos válidos e maliciosos.

### T-001-014 — Implementar `UserRepository`

- [x] Criar operações mínimas de conta por ID/e-mail, verificação, hash e estado.
- Referências: BR-IDA-001/008/010, plano §4.
- Dependências: T-001-009, T-001-010.
- Resultado: aplicação não consulta tabela diretamente.
- Validação: integração cobre criação, busca normalizada, verificação e estados.

### T-001-015 — Implementar `AuthTokenRepository` `P`

- [x] Emitir, invalidar e consumir tokens por finalidade com condição atômica.
- Referências: AC-001-05/06/15/16, plano §§9.3 e 10.
- Dependências: T-001-009, T-001-012.
- Resultado: nova emissão invalida pendentes e somente uma confirmação concorrente vence.
- Validação: integração com duas confirmações simultâneas e relógio falso.

### T-001-016 — Implementar `SessionRepository` `P`

- [x] Criar, resolver, tocar com intervalo, expirar e revogar uma ou todas as sessões.
- Referências: AC-001-08/09/11/13/15, ADR-002.
- Dependências: T-001-009, T-001-012.
- Resultado: banco recebe somente digests; estado da conta é revalidado.
- Validação: integração cobre inatividade, expiração absoluta, logout, suspensão e revogação geral.

### T-001-017 — Implementar `RateLimitRepository` `P`

- [x] Atualizar janelas, contadores e bloqueios temporários por chave HMAC de ação/conta/origem.
- Referências: BR-IDA-011/012, AC-001-07/10/14, plano §11.
- Dependências: T-001-009, T-001-012.
- Resultado: nenhuma senha é usada na chave e nenhum bloqueio permanente automático existe.
- Validação: integração concorrente e unitários de janelas, `Retry-After` e relógio.

## 6. Fase D — Casos de uso

### T-001-018 — Implementar cadastro

- [ ] Orquestrar validação, limite, unicidade, hash, consentimentos, conta e token de verificação.
- Referências: RF-IDA-001, AC-001-01/02/03/04.
- Dependências: T-001-011, T-001-014, T-001-015, T-001-017.
- Resultado: conta e token são transacionais; duplicidade produz resposta neutra.
- Validação: unitário do caso de uso e integração concorrente.

### T-001-019 — Implementar confirmação de e-mail `P`

- [ ] Consumir token válido, marcar verificação e invalidar pendentes de forma atômica.
- Referências: RF-IDA-002, AC-001-05/06.
- Dependências: T-001-014, T-001-015.
- Resultado: repetição segura não altera novamente o estado.
- Validação: sucesso, expirado, usado, inválido e corrida.

### T-001-020 — Implementar reenvio de verificação `P`

- [ ] Responder de forma neutra, aplicar intervalo/janela e emitir somente para conta elegível.
- Referências: AC-001-06/07, SPEC-001 fluxo 9.4.
- Dependências: T-001-014, T-001-015, T-001-017.
- Resultado: novo token invalida anterior e abuso não revela conta.
- Validação: relógio falso, conta inexistente/verificada/suspensa e limite.

### T-001-021 — Implementar login

- [ ] Verificar limite, conta, Argon2id, retorno e criar sessão comum ou restrita.
- Referências: RF-IDA-003/006, AC-001-08 a AC-001-12.
- Dependências: T-001-011, T-001-013, T-001-014, T-001-016, T-001-017.
- Resultado: mensagem genérica para credencial inválida e sessão somente após persistência.
- Validação: matriz de credencial, verificação, estado, retorno e limite.

### T-001-022 — Implementar resolução da identidade atual

- [ ] Resolver cookie, sessão, expirações, conta e token CSRF e retornar visão mínima.
- Referências: RF-IDA-007, BR-IDA-004/005/013, AC-001-17.
- Dependências: T-001-014, T-001-016.
- Resultado: identidade distingue comum, restrita e administrativa sem expor credencial.
- Validação: unitários e integração para sessão válida, ausente, expirada, revogada e suspensa.

### T-001-023 — Implementar logout `P`

- [ ] Revogar sessão atual de forma idempotente.
- Referências: RF-IDA-003, AC-001-13.
- Dependências: T-001-016.
- Resultado: repetir saída não reativa nem produz falha prejudicial.
- Validação: integração e tentativa de uso do cookie anterior.

### T-001-024 — Implementar solicitação de redefinição `P`

- [ ] Aplicar resposta neutra, limites e emissão para conta elegível.
- Referências: RF-IDA-004, AC-001-14.
- Dependências: T-001-014, T-001-015, T-001-017.
- Resultado: solicitação não altera ou bloqueia a conta.
- Validação: existente/inexistente produzem contrato equivalente; limites funcionam.

### T-001-025 — Implementar confirmação de redefinição

- [ ] Validar política e token e, em transação, atualizar hash, consumir token e revogar todas as sessões.
- Referências: RF-IDA-004, AC-001-03/04/15/16.
- Dependências: T-001-011, T-001-014, T-001-015, T-001-016.
- Resultado: sem login automático; conta suspensa permanece suspensa.
- Validação: integração de rollback, concorrência, expiração e revogação geral.

## 7. Fase E — HTTP e proteção do navegador

### T-001-026 — Implementar Problem Details global

- [ ] Mapear validação, autenticação, conflito, mídia, limite e falha interna para RFC 9457.
- Referências: RNF-API-001/002, plano §8.
- Dependências: T-001-002.
- Resultado: `traceId` opaco e mensagens sem detalhes internos.
- Validação: testes HTTP por tipo de erro e captura de exceção inesperada.

### T-001-027 — Implementar controllers e DTOs de identidade

- [ ] Expor os oito contratos REST e anotações OpenAPI do plano.
- Referências: RF-IDA-001 a RF-IDA-007, plano §7.
- Dependências: T-001-018 a T-001-025, T-001-026.
- Resultado: nenhum controller contém regra de negócio ou acesso Prisma direto.
- Validação: testes HTTP de entrada, status, corpo e `Content-Type`.

### T-001-028 — Implementar emissão e remoção do cookie

- [ ] Aplicar nome por ambiente, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, sem `Domain` e `no-store`.
- Referências: ADR-002, AC-001-08/13.
- Dependências: T-001-021, T-001-023, T-001-027.
- Resultado: configuração insegura não chega à beta.
- Validação: teste HTTP compara atributos locais e de produção.

### T-001-029 — Implementar guard e identidade da requisição

- [ ] Fornecer decorators/guards para sessão comum, sessão restrita e permissão administrativa futura.
- Referências: BR-IDA-004/005/007/008, AC-001-09/11/17.
- Dependências: T-001-022, T-001-027.
- Resultado: módulos futuros recebem identidade, nunca objeto Prisma de credencial.
- Validação: rotas de teste negam ausente, restrita, suspensa e papel insuficiente.

### T-001-030 — Implementar CORS, origem e CSRF

- [ ] Exigir origem explícita, JSON e `X-CSRF-Token` nas mutações autenticadas; rejeitar cross-site.
- Referências: ADR-002, BR-SEC-001/010.
- Dependências: T-001-022, T-001-027, T-001-028.
- Resultado: sem origem curinga com credenciais e sem token em URL.
- Validação: matriz HTTP de origem, preflight, conteúdo, método e token.

### T-001-031 — Integrar limites aos endpoints

- [ ] Aplicar chaves e janelas específicas antes de operações caras, especialmente Argon2id e SMTP.
- Referências: AC-001-07/10/14, plano §11.
- Dependências: T-001-017, T-001-027.
- Resultado: `429` consistente e `Retry-After` quando aplicável.
- Validação: testes HTTP com relógio falso e garantia de que senha não integra chave/log.

## 8. Fase F — E-mail transacional

### T-001-032 — Implementar SMTP local e porta de e-mail

- [ ] Criar adaptador SMTP e configuração para Mailpit sem acoplar caso de uso ao provedor.
- Referências: plano §12, AC-001-01/14/15.
- Dependências: T-001-004, T-001-005.
- Resultado: ambiente local captura e-mails sem envio real.
- Validação: teste de integração encontra mensagem no Mailpit.

### T-001-033 — Criar links e templates seguros

- [ ] Criar templates PT-BR de verificação, redefinição e aviso, usando origem confiável configurada.
- Referências: SPEC-001 §§9 e 12, plano §12.
- Dependências: T-001-032.
- Resultado: sem senha, token em log ou URL construída por host da requisição.
- Validação: snapshots ou testes estruturais de assunto, destino, expiração e link.

### T-001-034 — Conectar e-mail aos casos de uso

- [ ] Enviar após commit; tratar falha com observabilidade e reenvio, mantendo resposta neutra.
- Referências: AC-001-01/07/14/15, plano §6.1.
- Dependências: T-001-018, T-001-020, T-001-024, T-001-025, T-001-033.
- Resultado: falha SMTP não desfaz conta válida nem revela existência.
- Validação: integração com sucesso e SMTP indisponível.

## 9. Fase G — Frontend

### T-001-035 — Criar cliente da API e estado de autenticação

- [ ] Implementar requisições com `credentials: include`, Problem Details tipado, identidade mínima e CSRF em memória.
- Referências: plano §§7, 8, 13 e 14.
- Dependências: T-001-003, T-001-027, T-001-030.
- Resultado: nenhum token de sessão ou CSRF é persistido em armazenamento web.
- Validação: testes do cliente para sessão, erro, logout e recarga.

### T-001-036 — Implementar cadastro AUT-01

- [ ] Criar formulário responsivo com nome, e-mail, senha, confirmação e aceites legais.
- Referências: RF-IDA-001, AC-001-01 a AC-001-04, telas AUT-01.
- Dependências: T-001-003, T-001-035.
- Resultado: gerenciadores de senha, teclado, foco e mensagens por campo funcionam.
- Validação: componente e E2E de válido, inválido, duplicado neutro e envio.

### T-001-037 — Implementar verificação AUT-03 `P`

- [ ] Capturar token com segurança, removê-lo da URL visível, confirmar e permitir reenvio controlado.
- Referências: RF-IDA-002, AC-001-05 a AC-001-07.
- Dependências: T-001-003, T-001-035.
- Resultado: estados válido, inválido, expirado, usado e limitado.
- Validação: componente, política de referência e E2E com Mailpit.

### T-001-038 — Implementar login AUT-02 `P`

- [ ] Criar formulário e tratar credencial genérica, sessão restrita, conta indisponível e retorno seguro.
- Referências: RF-IDA-003/006, AC-001-08 a AC-001-12.
- Dependências: T-001-003, T-001-035.
- Resultado: senha não permanece após falha e interface não tenta autorizar por conta própria.
- Validação: componente e E2E por estado da conta.

### T-001-039 — Implementar recuperação AUT-04/AUT-05 `P`

- [ ] Criar solicitação neutra e redefinição com token, nova senha e retorno ao login.
- Referências: RF-IDA-004, AC-001-14 a AC-001-16.
- Dependências: T-001-003, T-001-035.
- Resultado: token não é persistido e estados de expiração são compreensíveis.
- Validação: componente e E2E com sessões antigas invalidadas.

### T-001-040 — Implementar acesso indisponível AUT-06

- [ ] Apresentar verificação pendente, sessão expirada, conta indisponível e acesso negado sem misturar causas sensíveis.
- Referências: RF-IDA-006/007, AC-001-09/11/17.
- Dependências: T-001-035, T-001-038.
- Resultado: cada estado oferece próximo passo seguro.
- Validação: navegação por teclado, foco e cenários de redirecionamento.

## 10. Fase H — Validação integrada

### T-001-041 — Consolidar suíte unitária

- [ ] Confirmar cobertura de políticas, casos de uso, expiração, retorno e limites.
- Referências: todos os ACs e BR-IDA.
- Dependências: T-001-018 a T-001-025.
- Resultado: testes determinísticos sem banco ou SMTP real quando não necessários.
- Validação: suíte unitária passa repetidamente com relógio falso.

### T-001-042 — Consolidar suíte de integração PostgreSQL `P`

- [ ] Executar cadastro concorrente, token concorrente, sessão, reset atômico e limites.
- Referências: AC-001-01/02/05/06/07/08/13/15/16.
- Dependências: T-001-008 a T-001-025.
- Resultado: testes aplicam migration em banco isolado e limpam seus dados.
- Validação: suíte passa em banco novo e em execução repetida.

### T-001-043 — Executar testes HTTP de segurança `P`

- [ ] Cobrir cookies, CORS, CSRF, mídia, Problem Details, cache, acesso negado e redaction.
- Referências: AC-001-10/11/12/17/18, RNF-SEC.
- Dependências: T-001-026 a T-001-031.
- Resultado: cenários positivos e negativos verificam headers e ausência de segredo.
- Validação: relatório da suíte HTTP sem falhas.

### T-001-044 — Executar jornadas E2E

- [ ] Automatizar cadastro/verificação/login/logout e recuperação/revogação usando navegador, API, PostgreSQL e Mailpit locais.
- Referências: J-01/J-03, AC-001-01 a AC-001-18.
- Dependências: T-001-034 a T-001-043.
- Resultado: dois fluxos completos e cenários de conta não verificada/suspensa.
- Validação: E2E passa a partir de ambiente limpo e produz evidência sem segredo.

## 11. Fase I — Operação e encerramento

### T-001-045 — Implementar limpeza técnica

- [ ] Criar tarefa simples para remover sessões, tokens e limites expirados conforme configuração.
- Referências: plano §16.
- Dependências: T-001-008, T-001-016, T-001-017.
- Resultado: comando ou agendamento idempotente, sem apagar conta ou consentimento.
- Validação: integração com registros ativos e expirados.

### T-001-046 — Sincronizar OpenAPI e documentação

- [ ] Publicar contratos, exemplos, erros e configuração sem segredos e atualizar índices afetados.
- Referências: RNF-API-001/002, Definition of Done.
- Dependências: T-001-027 a T-001-031.
- Resultado: OpenAPI gerado corresponde aos testes HTTP.
- Validação: contrato é gerado e revisado sem divergência conhecida.

### T-001-047 — Verificar segurança e dependências

- [ ] Inspecionar dependências, arquivos versionados, logs de teste, headers e exemplos de ambiente.
- Referências: AC-001-18, BR-SEC-003/006.
- Dependências: T-001-041 a T-001-046.
- Resultado: nenhum segredo, token, senha ou hash aparece no repositório ou artefatos.
- Validação: verificações automatizadas disponíveis e inspeção registrada.

### T-001-048 — Verificar Definition of Done

- [ ] Conferir todos os critérios, testes, migrations, telas, API, ADR e documentação.
- Referências: Constituição §5, Spec 001 §23.
- Dependências: T-001-044, T-001-045, T-001-046, T-001-047.
- Resultado: Spec muda para `Concluída` somente se não houver critério pendente ou defeito crítico conhecido.
- Validação: matriz abaixo completa e comandos agregados passam em ambiente limpo.

## 12. Matriz de cobertura

| Critério | Implementação principal | Testes finais | Estado |
|---|---|---|---|
| AC-001-01 | T-001-018, 027, 034, 036 | T-001-042, 044 | Pendente |
| AC-001-02 | T-001-010, 014, 018 | T-001-042, 044 | Pendente |
| AC-001-03 | T-001-011, 018, 025 | T-001-041, 042 | Pendente |
| AC-001-04 | T-001-011, 036, 039 | T-001-041, 044 | Pendente |
| AC-001-05 | T-001-015, 019, 037 | T-001-042, 044 | Pendente |
| AC-001-06 | T-001-015, 019, 037 | T-001-042, 044 | Pendente |
| AC-001-07 | T-001-017, 020, 031 | T-001-041, 043 | Pendente |
| AC-001-08 | T-001-016, 021, 028, 038 | T-001-042, 044 | Pendente |
| AC-001-09 | T-001-021, 022, 029, 038 | T-001-043, 044 | Pendente |
| AC-001-10 | T-001-017, 021, 026 | T-001-041, 043 | Pendente |
| AC-001-11 | T-001-014, 021, 022 | T-001-042, 044 | Pendente |
| AC-001-12 | T-001-013, 021, 038 | T-001-041, 043 | Pendente |
| AC-001-13 | T-001-016, 023, 028 | T-001-042, 044 | Pendente |
| AC-001-14 | T-001-017, 024, 034, 039 | T-001-043, 044 | Pendente |
| AC-001-15 | T-001-015, 016, 025, 039 | T-001-042, 044 | Pendente |
| AC-001-16 | T-001-015, 025, 039 | T-001-042, 044 | Pendente |
| AC-001-17 | T-001-022, 029, 040 | T-001-043, 044 | Pendente |
| AC-001-18 | T-001-012, 026, 033, 047 | T-001-043, 047 | Pendente |

## 13. Comandos de validação esperados

Os nomes finais serão definidos no scaffold, preservando estas capacidades:

```text
npm ci
npm run lint
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
npm run prisma:validate
npm run prisma:migrate:test
```

Todos deverão ser executáveis a partir da raiz ou documentar claramente o workspace correspondente.

## 14. Bloqueios conhecidos

Nenhum bloqueio impede iniciar a implementação local após autorização do responsável pelo produto.

Antes da beta externa ainda serão necessários:

- Provedor SMTP de produção.
- Domínios e HTTPS.
- Revisão jurídica dos documentos aceitos.
- Benchmark de Argon2id no ambiente real.
- Decisão operacional sobre MFA administrativa.

Esses itens não autorizam simulação insegura em produção nem impedem Mailpit e configuração local.

## 15. Checklist de prontidão

- [x] Spec aprovada.
- [x] Plano aprovado.
- [x] ADR necessário aceito.
- [x] Tarefas cobrem todos os critérios.
- [x] Dependências estão explícitas.
- [x] Validações esperadas estão definidas.
- [x] Nenhuma questão comportamental bloqueante permanece aberta.
- [x] Escopo continua limitado à identidade e acesso.

## 16. Próximo passo

A implementação concluiu as tarefas T-001-001 a T-001-017. O próximo incremento é T-001-018 — orquestrar o cadastro de conta.
