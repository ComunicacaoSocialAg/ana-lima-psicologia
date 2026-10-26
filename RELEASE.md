# Ana Lima — versão candidata de segurança e financeiro Asaas

Estado: código preparado e validado localmente. Nenhum deploy ou cobrança real foi executado por esta entrega. A conexão com o Asaas real/Sandbox e as configurações da infraestrutura ainda precisam ser validadas antes de publicar.

## Regras implementadas

| Modalidade | Como calcula | Emissão |
|---|---|---|
| Após a sessão | Valor registrado na sessão realizada ou falta cobrável, com vigência configurada | Prévia ou rotina diária quando autorizada |
| Fechamento mensal | Soma sessões cobráveis não pagas do mês encerrado; uma cobrança por período | Prévia ou rotina diária; vencimento no mês seguinte |
| Plano mensal | Valor mensal acordado, cobertura de quatro sessões | Prévia; automação somente após quatro sessões cobráveis registradas |
| Atendimento social | Valor, vencimento e sessões escolhidos pela Ana em cada emissão | Sempre manual, sem periodicidade presumida |

### Cobrança Pix Exclusiva no Asaas
- A emissão integrada no Asaas opera **exclusivamente via Pix** (`billingType: "PIX"`). Boletos, cartões e parcelamentos não estão habilitados nem visíveis na configuração de cobrança.
- **QR Code e Pix Copia e Cola:** O backend consulta o endpoint `/v3/payments/{id}/pixQrCode` no Asaas tanto na emissão quanto sob demanda via função callable `getPixQrCode`. Os dados (`pixPayload`, `pixEncodedImage`, `pixExpirationDate`) são armazenados na cobrança.
- **Painel e Mensagens:** O `BillingPanel` disponibiliza visualizador dedicado com renderização do QR Code em imagem, campo de Pix Copia e Cola com cópia em 1 clique, demonstração das taxas do Asaas (valor bruto, taxa e valor líquido) e composição de mensagem no WhatsApp contendo o código Pix Copia e Cola e o link da fatura digital.
- **Recebimento Direto (Manual):** Caso a Ana receba Pix diretamente em sua conta bancária pessoal (chave `settings.pixKey`), ela continua registrando o lançamento manual em `FinancialView`, sem classificá-lo como transação Asaas. A cobertura transacional (`legacyCoverage`) garante que cobranças integradas não dupliquem lançamentos manuais quitados.

A quinta sessão, meses parciais, férias, créditos e pausas não recebem preço ou ajuste inventado. Sessões extras aparecem para revisão. Um plano pode ser emitido manualmente antes das quatro sessões mediante conferência da prévia; a automação não presume que um mês vazio deva ser cobrado.

Configuração de cobrança começa na data de vigência escolhida. O preço acordado atualiza o padrão do cadastro para novos agendamentos por sessão/fechamento; sessões antigas preservam seu valor. Pacientes com cobrança integrada deixam de criar lançamentos manuais automáticos por sessão. Histórico anterior é preservado.

Lançamentos pagos excluem a sessão da cobrança avulsa/mensal. Pagamento avulso anterior em mês de plano exige revisão. Lançamentos antigos sem vínculo com sessão bloqueiam emissão automática daquele período: precisam de conciliação administrativa antes de converter histórico. Não há migração financeira em massa.

Emissão usa prévia recalculada no servidor e reservas transacionais de sessão/período. Cada intenção recebe referência estável. Timeout após um POST não autoriza outro POST: consulta-se a cobrança por referência. Repetir somente após rejeição definitiva ou comprovação de que nenhum POST ocorreu. Cancelamentos preservam histórico; reemissão transfere a cobertura para uma nova cobrança vinculada à anterior. Estorno integral exige confirmação e não é repetido em resposta incerta. Estornos parciais recebidos do Asaas são representados no saldo.

`CONFIRMED` é pagamento confirmado, enquanto `RECEIVED` representa recebimento informado pelo Asaas. Valores bruto e líquido são separados. Não se promete saldo sacável em uma conta real sem conferir sua situação no Asaas.

## Segurança aplicada ao código

- Autenticação da titular antes de carregar dados; cofre local separado por senha, PBKDF2/AES-GCM, sem chave no disco nem fallback em texto puro.
- Snapshots, avisos e auditoria local criptografados. Outbox criptografado conserva alterações ainda não sincronizadas e impede logout com pendências.
- Firestore usa cache em memória. Cache IndexedDB anterior é removido apenas no procedimento explícito de migração após conferência e recuperação criptografada.
- Originais locais anteriores à migração permanecem até confirmação de download. Uma cópia exata anterior à migração continua no arquivo criptografado. Nunca executar limpeza antes de sincronizar a versão antiga.
- Arquivar paciente preserva cadastro/histórico. Cancelar sessão preserva registros e lançamentos pagos.
- Regras por coleção nos caminhos efetivamente usados; cliente não apaga prontuários/anamneses/auditoria nem modifica cobranças integradas. Fatos financeiros de sessão cobrada ficam bloqueados.
- Formulário público minimizado, confirmação real no servidor, App Check obrigatório e limite por origem com identificador HMAC. Não coleta CPF, queixa ou histórico de saúde.
- Tokens da Agenda só durante a sessão. Notificações nativas não revelam nome do paciente. Observações clínicas e telefones não são enviados à Agenda. Links novos de evento não carregam nome na URL e usam fragmento.
- Chave Asaas somente no Secret Manager. Webhook usa token próprio, caixa de entrada persistida, deduplicação e consulta do estado atual no provedor. Não guarda payload completo com dados do pagador nos logs.
- CI utiliza dados fictícios. Senhas padrão de backup foram removidas. Erros de extração abortam o backup; a verificação não imprime nome/CPF.
- Atualizações do PWA não forçam recarga de abas em edição. CSP sem scripts inline e política de referência restrita.

São medidas técnicas; não constituem certificado LGPD. IAM, MFA, proteção de exclusão do banco, região dos dados, contratos, aviso de privacidade, retenção legal, atendimento de direitos e resposta a incidentes precisam de validação organizacional.

## Serviços que precisam ser configurados

1. Projeto de homologação Firebase separado, com Authentication, Firestore e Functions/Blaze. Não usar o banco clínico real para testes. O UID da titular é restrito no código e nas regras; o ambiente de teste deve representar essa identidade de forma controlada.
2. App Check com reCAPTCHA Enterprise e domínios autorizados. Configurar a chave pública `VITE_APP_CHECK_SITE_KEY` na compilação; nenhuma chave secreta entra em `VITE_*`. As funções recusam chamadas sem atestado válido.
3. Segredos no Firebase Secret Manager, cadastrados por entrada interativa local, nunca no chat/repositório:
   - `ASAAS_API_KEY`: chave do ambiente escolhido.
   - `ASAAS_WEBHOOK_TOKEN`: segredo próprio, aleatório, pelo menos 32 caracteres; diferente da chave API.
   - `INTAKE_RATE_SALT`: segredo aleatório de pelo menos 32 caracteres.
   - `CLINICAL_BACKUP_PASSPHRASE`: senha aleatória de pelo menos 20 caracteres, guardada separadamente.
4. Parâmetros do backend: `ASAAS_ENVIRONMENT=sandbox`, `ASAAS_PRODUCTION_ENABLED=false` e bucket privado de backup. Produção exige liberação explícita dos dois parâmetros e credencial do ambiente correspondente.
5. Webhook Asaas apontando para `asaasWebhook`, com eventos de pagamento, token separado e acompanhamento da fila. Sandbox e produção têm configurações distintas. No backend, o evento só é confirmado após persistência; falhas são reprocessadas.
6. Bucket separado com bloqueio de acesso público, IAM mínimo, acesso uniforme e política de ciclo de vida revisada (`functions/backup-lifecycle.json`). O backend cria arquivos cifrados; o ciclo de vida do bucket faz a retenção 7/28/366 dias. Isso é backup operacional, não política de guarda do prontuário.
7. TTL de `intakeRateLimits.expiresAt` e `asaasWebhookInbox.expiresAt`; monitoramento de `billingAlerts`, `backupRuns`, falhas de funções e filas. Alertas de orçamento e limites de escala antes de liberar automações.

Functions, Scheduler, Storage/Secret Manager e recebimentos Asaas podem ter custos. Não houve ativação de serviço cobrado nesta entrega. As notificações pagas do Asaas ficam desativadas no cadastro criado pela integração. WhatsApp prepara um rascunho para envio humano. Não foram enviados avisos a pacientes.

## Publicação com o sistema já no ar

Antes da mudança, identificar a release publicada e a configuração atual. A cópia local original tinha alterações sem commit e divergência entre `package.json` e `public/version.json`; não presumir que o checkout seja a produção.

1. Preparar recuperação independente do banco e comprovar restauração em ambiente isolado. Na versão antiga, sincronizar todos os aparelhos/abas e conferir dados pendentes antes de fechar qualquer aba. Não usar logout/reset como teste. Não limpar armazenamento do navegador.
2. Registrar contagens e totais: pacientes, sessões, prontuários, anamneses, avaliações, pagamentos e valor por estado. Guardar versão anterior de código/regras/build. Manter faturamento automático desativado durante toda a transição.
3. Validar primeiro em homologação: funções/segredos/App Check, formulário público, quatro modalidades com dados fictícios, webhook, timeout, cancelamento, reemissão, estorno, backup e restauração.
4. Publicar primeiro o backend configurado. Programar troca de frontend e regras com as abas antigas sincronizadas e encerradas. Evitar clientes antigos enviando ao endpoint público que passará a ser bloqueado.
5. Compilar com a configuração de produção revisada e publicar hosting/regras. `npm run deploy` genérico foi bloqueado para impedir uma atualização parcial acidental. A publicação explícita deve selecionar projeto e componentes depois desta revisão.
6. Na primeira abertura, entrar com a conta titular e criar a senha do cofre. Conferir os dados do servidor e comparar com a recuperação local anterior. Gerar arquivo criptografado e só então confirmar a limpeza dos caches antigos. Se faltar chave antiga ou houver conflito, o processo deve parar preservando os originais.
7. Migrar a modalidade de poucos pacientes inicialmente, com vigência expressa. Conferir CPF/pagador, valor, período, ambiente e notificações desativadas. Validar um ciclo completo no Sandbox real antes de usar credenciais de produção.
8. Liberar produção e, separadamente, automação por paciente somente após revisão dos valores. A automação gera cobranças; não representa autorização de débito automático Pix ou cartão. Assinaturas nativas e Pix Automático não foram habilitados por esta entrega.

Rollback: suspender automações e emissão antes de reverter; preservar novas coleções financeiras, eventos recebidos e arquivos de recuperação. Não restaurar regras antigas amplas ou apagar dados novos como rollback. Resolver pendências com conciliação e uma release corretiva.

## Recuperação isolada

O backend produz arquivo cifrado de schema 3 das coleções privadas clínicas e financeiras. A exportação pelo navegador inclui os dados locais, pendências e financeiro acessível no servidor; existe uma opção de contingência local claramente identificada, sem prometer completude do financeiro.

A ferramenta `scripts/restore-isolated.mjs` aceita apenas projeto `demo-` e emulador local. Por padrão faz prévia; `--apply` cria documentos somente em destino vazio e verifica contagem/conteúdo. Não sobrescreve produção. `--legacy-local` seleciona a cópia anterior à migração, quando presente no arquivo de exportação do navegador.

Exemplo com arquivo fictício e senha fornecida por variável local:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/restore-isolated.mjs /caminho/copia.enc.json --project demo-ana-lima-recovery
```

Usar `BACKUP_PASSPHRASE` no ambiente local de forma protegida. A chave não é incluída no comando de exemplo nem no repositório. Guarda da senha é requisito de recuperação.

## Verificação realizada e limites

Consultar `VALIDACAO.md`. Testes de regra e integração usam emulador local com dados fictícios e um provedor Asaas simulado. Isso verifica o comportamento do código, mas não comprova autorização da conta real, entrega real de webhook, cobertura de taxas ou regras do deploy atual. Esses pontos continuam como condições de liberação.

Fontes de contrato: https://docs.asaas.com/docs/authentication-2 ; https://docs.asaas.com/docs/creating-customers ; https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint ; https://firebase.google.com/docs/app-check/cloud-functions ; https://firebase.google.com/docs/functions/config-env .
