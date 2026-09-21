# PROMPT — Melhorias do CaixaControl (Financeiro Empresa D)

> Prompt completo e autocontido. Pode ser colado em uma nova sessão (junto com o arquivo `CaixaControl.jsx` atual, se disponível) para executar as melhorias abaixo. Escrito em português porque o produto, os usuários e a terminologia são brasileiros.

---

## 0. Papel e objetivo

Você é um engenheiro full-stack sênior (Node.js/Go, PostgreSQL, React) especializado em sistemas de PDV e controle financeiro de varejo brasileiro. Sua tarefa é **evoluir o CaixaControl**, um sistema de abertura e fechamento de caixa que **já está em produção**, entregando quatro melhorias:

1. **Backend + banco de dados real** (substituir `window.storage`).
2. **Modo offline com sincronização e resolução de conflitos** entre terminais.
3. **Conciliação de cartões** (vendas do caixa × extrato das adquirentes).
4. **Relatórios expandidos e exportação** (CSV/PDF).

Entregue **código funcionando e testado**, não apenas um plano. Ao terminar, informe o que foi verificado de fato e o que ficou como suposição.

---

## 1. Contexto do sistema atual (não reescrever)

- Aplicação React em **um único arquivo** `CaixaControl.jsx`, interface e termos em **português (pt-BR)**, voltada ao varejo brasileiro, **genérica quanto ao segmento**.
- Ambiente **multi-caixa e multi-operador** dentro de uma loja. Papéis: **operador** e **gerente**.
- Ciclo já implementado:
  - **Abertura:** login do operador, sugestão automática de troco inicial (fundo) por média histórica, gestão de turno.
  - **Durante o turno:** vendas por forma de pagamento; **suprimento/sangria** com motivo obrigatório e autorização de gerente; alerta de teto da gaveta; **estorno** que preserva todo o histórico.
  - **Fechamento:** contagem cega, diferença automática por forma de pagamento, comprovante travado no estilo **Redução Z**.
  - **Relatórios:** Leitura X (parcial), histórico com estatísticas de divergência por operador.
  - **Configurações:** caixas, operadores e papéis, formas de pagamento, parâmetros gerais.
  - **Sincronização entre terminais:** dados em `window.storage` compartilhado, com *polling* de 15 s.
- Referências de mercado estudadas: ECF (Leitura X / Redução Z), Conta Azul, Linx/TOTVS, Alterdata, Consumer, Gálago, VendaSimples, Xefo, vhsys.
- Validação de sintaxe do JSX é feita com o parser do Babel a cada alteração.

### Restrições inegociáveis

1. **Não reescrever o app.** Ele está em produção. Toda mudança deve ser **aditiva**, atrás de *feature flag*, e reversível: com a flag desligada o app se comporta exatamente como hoje.
2. **Ponto de integração único:** o app fala com `window.storage` (`get`, `set`, `delete`, `list`, todos assíncronos, valores string, parâmetro `shared`). A troca para o backend deve ser feita por um **adaptador com o mesmo contrato**, instalado em **uma linha** antes de renderizar o app.
3. **Integridade de auditoria é inegociável:** nenhum registro financeiro é apagado ou sobrescrito sem rastro. Estorno preserva histórico. Exclusões são *tombstones*. O log de auditoria é *append-only* e verificável.
4. **Papéis aplicados no fluxo, não só na interface:** regras de gerente (autorização de sangria, alteração de configurações) devem ser reforçadas também no servidor.
5. **Automação onde possível, passos manuais práticos, organização visual clara.**
6. **Dinheiro nunca em ponto flutuante nos cálculos novos:** usar **centavos inteiros** internamente; converter só na borda (entrada/exibição).
7. **Compatibilidade de dados:** os dados que já existem em `window.storage` devem poder ser **migrados sem perda** (script de importação idempotente).
8. Preferências do desenvolvedor: JavaScript simples (sem TypeScript obrigatório), estilos **inline** ou classes nomeadas da escala padrão em componentes novos (evitar sintaxe arbitrária com colchetes do Tailwind, que quebra o parse ao editar pelo GitHub mobile), dependências mínimas.

---

## 2. Melhoria A — Backend + banco de dados real

### 2.1 Requisitos funcionais

- API HTTP JSON versionada (`/v1`), **multi-tenant desde o início** (`tenant_id` em toda tabela e em toda consulta), pensando na possível venda como assinatura mensal.
- **Autenticação por conta/terminal** (e-mail + senha, hash `scrypt`/`argon2`, JWT de curta duração com renovação). Perfis de servidor: `admin`, `manager`, `operator`. Limite de tentativas de login.
- **Armazenamento chave-valor compatível com `window.storage`**:
  - `GET /v1/kv/:key`, `PUT /v1/kv/:key`, `DELETE /v1/kv/:key`, `GET /v1/kv?prefix=` (metadados: chave, versão, atualizado em).
  - Escopo `shared` (toda a loja) e `user` (pessoal, por usuário).
  - **Concorrência otimista:** cada chave tem `version` incremental; `PUT` exige `baseVersion`; divergência retorna `409` com o valor e versão atuais.
  - **Idempotência:** cada escrita carrega um `opId`; repetir o mesmo `opId` não duplica efeitos (essencial para reenvio da fila offline).
  - Exclusão lógica (tombstone), nunca física.
  - Limite de tamanho por valor (5 MB, igual ao ambiente atual).
- **Trilha de auditoria append-only:** toda escrita/exclusão/login/importação/exportação gera um evento com ator, terminal, ação, versão de/para, IP e um *patch* (diferença) em vez do valor inteiro, para não explodir o armazenamento. O log deve ser **encadeado por hash** (cada linha guarda o hash da anterior) e existir um endpoint de **verificação da cadeia**. `UPDATE`/`DELETE` na tabela de auditoria devem ser bloqueados por *trigger*.
- **Guardas de imutabilidade no servidor** (configuráveis, sem conhecer o esquema exato do app): regras do tipo "registros dentro da chave `X` com `status = fechado` não podem ser alterados nem removidos". Isso protege o comprovante estilo Redução Z mesmo que um cliente com bug ou adulterado tente sobrescrevê-lo.
- **Política por papel e chave:** padrões de chave graváveis apenas por `manager`/`admin` (ex.: configurações, operadores, formas de pagamento), configuráveis por variável de ambiente.
- Rotas de conciliação e relatórios (seções 4 e 5).
- `GET /healthz`, logs estruturados, cabeçalhos de segurança, CORS restrito por configuração, limite de corpo, validação de entrada em toda rota.

### 2.2 Modelo de dados mínimo (PostgreSQL)

`tenants`, `users`, `kv_entries (tenant_id, owner, key, value, version, deleted, updated_at, updated_by)`, `audit_log (id, tenant_id, at, actor_id, actor_email, terminal_id, kind, key, from_version, to_version, op_id, ip, patch, prev_hash, hash)`, `card_statements`, `card_transactions`, `card_reconciliations`. Migrações versionadas em SQL puro com runner idempotente e tabela `schema_migrations`.

### 2.3 Migração dos dados existentes

Script que lê o conteúdo atual de `window.storage` (exportado como JSON `{chave: valor}`) e o grava no backend preservando as chaves, com `opId` determinístico (reexecutar não duplica). Deve gerar relatório do que foi importado.

### 2.4 Critérios de aceite

- Duas escritas concorrentes na mesma chave: uma vence, a outra recebe `409` e nenhum dado é perdido.
- Repetir o mesmo `opId` retorna sucesso sem alterar versão.
- Tentativa de alterar registro travado retorna `422` e fica registrada na auditoria.
- `UPDATE audit_log ...` falha. A verificação da cadeia detecta qualquer linha adulterada.
- Um usuário de um tenant **nunca** enxerga chaves de outro.
- Suíte de testes automatizados roda contra **PostgreSQL real**.

---

## 3. Melhoria B — Modo offline + sincronização

### 3.1 Requisitos

- **Adaptador `window.storage` drop-in** (mesmo contrato, mesmas formas de retorno e erro), com:
  - **Cache local persistente** (IndexedDB) com leitura imediata, inclusive sem rede.
  - **Fila de operações** persistente. Escrita local é aplicada na hora (otimista) e enfileirada; operações consecutivas na mesma chave são **coalescidas** para reduzir conflitos.
  - Reenvio automático com *backoff* exponencial e ao voltar a conexão (`online`, foco da aba). *Polling* de 15 s mantido como *fallback*.
  - Nenhuma operação é descartada em silêncio: erros permanentes (403/413/422) vão para uma **fila de rejeitadas** visível ao gerente.
  - Token expirado (401) pausa a sincronização **sem perder a fila**.
- **Resolução de conflitos com mesclagem em 3 vias** (base × local × remoto), no cliente, por tipo de dado:
  - **Listas de objetos com `id`:** união por `id`. Item adicionado em qualquer lado é mantido. Item editado só de um lado, vale esse lado. Editado nos dois, mescla campo a campo. Removido de um lado e editado no outro, **prevalece a edição** (auditoria acima de exclusão).
  - **Objetos:** mescla recursiva campo a campo. Se o mesmo campo mudou nos dois lados, vale o de maior `updatedAt`/`atualizadoEm` quando existir; senão o local.
  - **Listas de histórico/log (append-only):** união preservando ordem, sem duplicar.
  - **Contadores/sequenciais** (chaves como `seq`, `contador`, `proximo`, `ultimo`, `numero`): vale o **maior** valor, para não reutilizar numeração.
  - **Valores opacos** (não JSON): vale o local e o conflito é registrado.
  - Todo conflito resolvido automaticamente gera um **registro de conflito** consultável (o que era diferente e como foi resolvido).
- **Indicador de sincronização** na interface (Online / Offline / Sincronizando / N pendentes / N rejeitadas), como componente pequeno e opcional.
- **Regra operacional de segurança:** o app deve continuar abrindo turno, vendendo, fazendo sangria e fechando **sem rede**. Operações que exigem autorização de gerente offline usam a autorização local já existente e ficam marcadas como "autorizadas offline" para revisão posterior.

### 3.2 Critérios de aceite (cenários obrigatórios de teste)

1. Terminal A e B offline, ambos adicionam vendas diferentes na mesma lista; ao reconectar, **as duas vendas existem** nos dois terminais.
2. A estorna uma venda (edição) enquanto B adiciona outra: resultado contém estorno e nova venda.
3. A e B editam campos diferentes do mesmo objeto de configuração: ambos os campos são preservados.
4. Reenvio da mesma operação após falha de rede não duplica efeito.
5. Sessão expira no meio da fila: nada se perde; após novo login a fila é drenada.
6. Sequencial de numeração nunca retrocede após mesclagem.

---

## 4. Melhoria C — Conciliação de cartões

Objetivo: conferir se **cada venda em cartão registrada no caixa** foi **paga pela adquirente** no valor e prazo esperados, e prever **recebíveis**.

### 4.1 Importação de extratos

- Upload/colagem de arquivo CSV de adquirentes (Cielo, Rede, Stone, Getnet, PagBank, Mercado Pago e outras) com **detecção automática de colunas por sinônimos** (NSU, autorização, bandeira, valor bruto/líquido, taxa, data da venda, data de pagamento, parcelas, modalidade) e **mapeamento manual de colunas** como alternativa. Aceitar separador `;` ou `,`, decimal com vírgula, datas `dd/mm/aaaa`, BOM UTF-8.
- **Idempotência por hash do arquivo:** importar o mesmo extrato duas vezes é rejeitado.
- Parcelado: quebrar em uma linha por parcela **ou** manter a venda com N parcelas e datas previstas, mas de forma consistente.

### 4.2 Regras de conciliação (nesta ordem de confiança)

1. **NSU/autorização + valor** iguais → conciliado automaticamente.
2. Mesmo **valor bruto + data (tolerância configurável) + modalidade + bandeira**, candidato único → conciliado com confiança média, sinalizado.
3. Múltiplos candidatos → **pendente de revisão manual** (não adivinhar).
4. Resultados possíveis: `conciliado`, `divergente` (valor difere; guardar diferença), `sem_extrato` (venda no caixa sem pagamento correspondente), `sem_venda` (pagamento sem venda no caixa), `manual` (resolvido por gerente, com observação obrigatória).
- Cada linha do extrato só pode ser usada uma vez. Vendas **estornadas** entram com sinal correto.
- Todas as comparações em **centavos inteiros**.

### 4.3 Taxas e recebíveis

- Calcular **taxa efetiva (MDR)** por bandeira/modalidade/parcelas a partir do extrato e comparar com a taxa **contratada** configurável (alerta quando a taxa cobrada excede a contratada).
- **Agenda de recebíveis:** valor líquido esperado por data prevista de pagamento.
- Opcional configurável: custo de antecipação.

### 4.4 Interface

Painel "Conciliação de Cartões": importar extrato, executar conciliação por período, tabela de divergências com filtros, ação manual (aceitar/vincular/rejeitar com observação), resumo (conciliado, divergente, pendente, valor em risco) e exportação.

### 4.5 Critérios de aceite

Testes com extratos sintéticos cobrindo: casamento por NSU, por valor+data, ambiguidade, divergência de valor, venda sem pagamento, pagamento sem venda, estorno, parcelado, duplicidade de arquivo.

---

## 5. Melhoria D — Relatórios expandidos e exportação

- **Exportação CSV** pronta para o Excel brasileiro: separador `;`, decimal com vírgula, UTF-8 com BOM, datas `dd/mm/aaaa hh:mm`, proteção contra **injeção de fórmula** (células iniciadas por `=`, `+`, `-`, `@`).
- **PDF/impressão:** relatório em HTML otimizado para impressão (`@media print`), via `window.print()` ou geração no servidor, com cabeçalho da loja, período, emissor e **hash de integridade** do conjunto de dados.
- Relatórios:
  1. **Fechamento de turno** (esperado × contado por forma de pagamento, diferença, sangrias, suprimentos, estornos).
  2. **Divergência por operador** (média, máximo, tendência, nº de turnos com falta/sobra).
  3. **Vendas por forma de pagamento** e por hora/dia.
  4. **Movimentações de caixa** (sangria/suprimento com motivo e autorizador).
  5. **Estornos** (quem, quando, motivo, valor).
  6. **Conciliação de cartões** e **agenda de recebíveis**.
  7. **Auditoria** (eventos por período e ator).
- Filtros: período, caixa, operador, forma de pagamento. Exportar respeita os filtros aplicados.
- Toda exportação gera evento de auditoria.

---

## 6. Requisitos transversais

- **Segurança:** segredo JWT forte obrigatório, consultas 100% parametrizadas, isolamento por tenant em toda consulta, senha nunca em log, CORS restrito, limite de tamanho, tratamento de erro sem vazar detalhes internos.
- **LGPD:** minimizar dados pessoais, registrar quem acessou, permitir exportar/anonimizar dados de um operador desligado sem quebrar a auditoria financeira.
- **Desempenho:** *polling* baseado em metadados leves (chave + versão), nunca no valor inteiro. Consultas de relatório com índices adequados.
- **Fuso horário:** armazenar em UTC, exibir em `America/Sao_Paulo` (configurável).
- **Acessibilidade e mobile:** componentes novos utilizáveis em tela pequena e por teclado.
- **Observabilidade:** logs estruturados com `requestId`, métricas básicas de fila offline.
- **Testes:** unitários para funções puras (mescla, diff, CSV, conciliação), integração com PostgreSQL real, e **ponta a ponta** com o adaptador do cliente falando com o servidor real, incluindo cenários offline/conflito.
- **Implantação:** `Dockerfile` + `docker-compose` (API + PostgreSQL), variáveis de ambiente documentadas, migrações executadas no boot ou por comando.

---

## 7. Fora do escopo desta rodada (registrar como próximas fases)

- Integração fiscal além do comprovante estilo Redução Z (NFC-e, SAT, TEF, ECF real).
- Push em tempo real (SSE/WebSocket) para substituir o *polling*.
- Antifraude avançado e conciliação bancária (OFX).

---

## 8. Como executar (ordem obrigatória)

1. **Fase 0 — Descoberta.** Se `CaixaControl.jsx` estiver disponível, mapear: chaves usadas em `window.storage`, formato dos JSONs (vendas, turnos, movimentações, operadores), como o `shared` é usado e como erros de chave inexistente são tratados. **Se não estiver disponível, não invente:** implemente contra um modelo normalizado documentado e um *mapper* configurável, e liste as suposições.
2. **Fase 1 — Backend e banco** (Melhoria A) com testes contra PostgreSQL real.
3. **Fase 2 — Adaptador offline/sync** (Melhoria B) e teste ponta a ponta contra o servidor real.
4. **Fase 3 — Conciliação** (Melhoria C).
5. **Fase 4 — Relatórios/exportação** (Melhoria D).
6. **Fase 5 — Integração mínima no app:** uma linha para instalar o adaptador, componentes opcionais atrás de *feature flag*, script de migração dos dados.

Em cada fase: escrever os testes, rodar, corrigir, e só então seguir.

### Definição de pronto

- [ ] Todos os testes passam e foram **executados** (informar contagem).
- [ ] Sintaxe do JSX/JS validada com o parser.
- [ ] Com a *feature flag* desligada, o comportamento atual é idêntico.
- [ ] Nenhum registro pode ser apagado ou alterado sem rastro na auditoria.
- [ ] README com instalação, variáveis de ambiente, migração e rollback.
- [ ] Lista honesta de **limitações e suposições** (o que não foi possível verificar).

### Formato da resposta final

Resumo curto do que foi entregue, onde estão os arquivos, como ligar (uma linha de integração + variáveis), resultados dos testes e pendências que dependem de decisão do dono do produto.

---

## Anexo — Informações que dependem do código-fonte atual

Confirmar (ou corrigir) antes de ligar em produção:

1. Nomes das chaves usadas em `window.storage` e quais são `shared`.
2. Campos reais de venda, turno, movimentação e operador (para o *mapper* de relatórios e conciliação).
3. Valor do campo que marca turno **fechado** (para a guarda de imutabilidade).
4. Comportamento do app quando `get` de chave inexistente (lança erro ou retorna `null`).
5. Onde a aplicação é hospedada (para CORS e URL da API).
