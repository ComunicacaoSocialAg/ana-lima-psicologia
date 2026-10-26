# Validação da versão candidata — 23/10/2026

## Resultado observado

| Verificação | Resultado |
|---|---|
| TypeScript e compilação de produção | Concluídos sem erro |
| Testes unitários | 22 aprovados, nenhum ignorado ou reprovado |
| Integração com Firestore local | 13 cenários aprovados, nenhum ignorado ou reprovado |
| Auditoria npm do frontend, incluindo desenvolvimento | Zero vulnerabilidades conhecidas reportadas |
| Auditoria npm do backend, incluindo desenvolvimento | Zero vulnerabilidades conhecidas reportadas |
| Sintaxe do backend e dos scripts de backup | Sem erro |
| Inspeção visual do financeiro | Realizada em navegador com dados fictícios |
| Integridade da origem antes da aplicação | Todos os hashes da base utilizada permaneceram iguais |

A auditoria de dependências corresponde às versões travadas nos dois `package-lock.json` nesta data. Não é garantia de ausência de falhas no sistema.

## Cobertura dos testes

Os testes unitários exercitam cálculo de modalidades, vigência, mês parcial, pagamentos anteriores, quinta sessão para revisão, validação de datas e CPF/CNPJ; criptografia do cofre, migração legada, senha incorreta, falha de armazenamento e persistência da fila de alterações; cifragem, adulteração e normalização de backups; composição de totais sem contar duas vezes um lançamento antigo vinculado ao Asaas.

Os cenários de integração utilizam o Firestore Emulator e dados sintéticos:

1. Anônimo e outra conta não acessam os dados privados nem gravam diretamente na entrada pública.
2. O cliente não apaga registros clínicos/auditoria nem forja cobranças do servidor.
3. O backend rejeita chamadas sem a conta titular.
4. Aprovações simultâneas geram um único pagamento externo e uma única reserva de sessão.
5. Uma falha de comunicação após criar o pagamento é conciliada sem novo POST.
6. Pagamento anterior e prévia desatualizada impedem duplicação.
7. Webhook com token incorreto é rejeitado; eventos repetidos são deduplicados e uma leitura antiga não rebaixa um recebimento.
8. Atendimento social não gera cobrança presumida; valor e vencimento são explícitos.
9. Pré-cadastro recusa campos de saúde/extras, minimiza contato e limita envios.
10. Cancelamento, reemissão e estorno mantêm cobertura e não repetem a operação.
11. Trocar a modalidade não permite faturar novamente uma sessão coberta por plano.
12. Recuperação restaura e confere um destino vazio em projeto `demo-`; recusa projeto de produção.
13. CPF corrigido permite recuperação da emissão; duas tentativas aprovadas simultâneas não geram dois pagamentos.

Na integração, `fetch` do Asaas é substituído por respostas controladas. Somente o domínio Sandbox é aceito pelo simulador. Não houve cobrança real, envio a paciente ou consulta a prontuário de produção.

## Inspeção de interface

A tela financeira abriu em ambiente local, após autenticação de teste e desbloqueio do cofre. Foram conferidos seleção de paciente, modalidades, formulário de configuração e histórico com identificação Sandbox. A imagem `../financeiro-ambiente-ficticio.png` registra essa inspeção. Isso não constitui uma prova completa de todas as telas ou dispositivos.

## Limites e condições de liberação

- Nenhuma implantação foi executada. Regras, índices, IAM, App Check, backup agendado, bucket e serviços da conta publicada não foram inspecionados ou alterados remotamente.
- Não foi realizado ciclo de pagamento com o Sandbox real do Asaas. Credenciais, cadastro do pagador, notificações, taxas, vencimentos, URLs e entrega real do webhook precisam desse ensaio antes da produção.
- Os testes invocam os manipuladores das funções diretamente. Verificam autorização interna e regras do banco, mas não comprovam o transporte de Firebase Callable, atestado App Check/reCAPTCHA ou autenticação Google em domínio publicado.
- A restauração comprovada utiliza arquivo sintético. A recuperação de uma cópia clínica real exige procedimento controlado, sem expor pacientes nesta sessão.
- Conflitos de sincronização preservam a operação na fila cifrada e sinalizam falha. Não há fusão automática de evoluções clínicas concorrentes: a pendência precisa de revisão e recuperação antes de sair.
- Histórico desconhecido, lançamentos sem vínculo, ajustes de plano, pausas e sessão extra exigem conferência. Não há conversão em massa ou retroativa de saldos.
- Proteções de código não equivalem à conformidade integral com a LGPD. Procedimentos, contratos, retenção e acessos administrativos continuam sendo requisitos operacionais.

## Reprodução em ambiente isolado

Node.js 22.14 ou superior; instalar dependências com `npm ci` e `npm --prefix functions ci`. Compilar com `npm run build`. Testes unitários: `npm run test:billing`.

Para integração, iniciar somente Firestore/Auth no projeto de demonstração, em terminal separado:

```sh
firebase emulators:start --only firestore,auth --project demo-ana-lima-secure
```

Executar com o emulador ativo:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-ana-lima-secure node --test functions/test/emulator.integration.mjs
```

Esses testes apagam apenas as bases dos projetos de demonstração `demo-ana-lima-secure` e `demo-ana-lima-recovery` no emulador. Usar instância exclusiva, sem trabalho de outra pessoa. Não conectar os testes à produção.

Para revisão visual local, `VITE_USE_EMULATORS=true npm run dev`. O modo emulador é permitido somente em desenvolvimento e não habilita o backend local automaticamente; ações financeiras requerem Functions Emulator configurado, ou homologação independente.

Procedimento de configuração, publicação e recuperação: `RELEASE.md`.
