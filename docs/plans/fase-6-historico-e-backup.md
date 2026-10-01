---
titulo: Provario — Fase 6: Histórico e backup
data: 2026-10-01
status: implementado
---

# Plano — Provario, Fase 6: Histórico e backup

## Contexto
As Fases 1 a 5 estão concluídas. As provas já ficam salvas em `provario:exams` e podem ser editadas e impressas em `#/provas/:id`. Mas só dá para chegar numa prova pelo redirecionamento logo depois de gerá-la, porque não existe uma lista. E como tudo fica só no `localStorage`, limpar o navegador apaga perfis e provas. A Fase 6 adiciona a tela de histórico (abrir, duplicar e excluir) e o backup em arquivo JSON (exportar e importar).

Decisões tomadas com a usuária:
- **Navegação:** a aba "Nova prova" passa a se chamar **"Provas"** e abre `#/provas` (o histórico), com o botão "Nova prova" no topo, no mesmo padrão de Perfis.
- **Importação:** depois de validar o arquivo, mostra um resumo e ela **escolhe entre substituir ou mesclar**. Mesclar junta os itens por `id` e, quando houver conflito, fica a versão com `atualizadoEm` mais recente.
- **Backup:** fica numa seção nova, "Backup dos dados", em **Configurações**.
- **Título editável:** o modo edição de `Prova.tsx` ganha um campo de título, salvo junto com as questões. A cópia sai como "… (cópia)".

## Objetivo e escopo
**Entra:**
- `#/provas`: lista das provas salvas, das mais recentes para as mais antigas, com título, conteúdo, série/turmas, perfil (do snapshot) e data
- Ações por prova: **Abrir** (vai para `#/provas/:id`, onde ela edita e reimprime), **Duplicar** (cópia independente com id novo, e depois abre a cópia) e **Excluir** (com `ConfirmDialog`)
- Estado vazio amigável, com link para gerar a primeira prova
- Título editável no modo edição da prova
- Exportar backup: download de `provario-backup-AAAA-MM-DD.json` com os perfis e as provas
- Importar backup: lê o arquivo, valida tudo (aceita o arquivo inteiro ou recusa o arquivo inteiro), mostra o resumo e deixa escolher entre mesclar e substituir. Substituir pede confirmação. Se faltar espaço no navegador, a importação é revertida.

**Fica de fora:** busca e filtro no histórico, lembrete de "faça backup", backup da chave do Gemini e de `exam-defaults` (a chave não deve sair do navegador num arquivo que pode ser compartilhado), sincronização em nuvem, edição do perfil/cabeçalho de uma prova salva.

## Abordagem técnica e decisões

### Helpers puros em `src/lib/exams.ts` (testes em `exams.test.ts`)
- `sortExams(provas)`: ordena por `criadoEm` decrescente. Como a cópia ganha um `criadoEm` novo, ela aparece no topo.
- `deleteExam(data, id): ExamsData`, no mesmo formato de `deleteProfile` em `profiles.ts`.
- `duplicateExam(exam, agora, id = crypto.randomUUID()): Exam`: id novo, título `"<título> (cópia)"`, `criadoEm`/`atualizadoEm` = agora e as `questoes` copiadas (arrays novos). Mantém o mesmo snapshot de perfil. Para gravar, reusa o `addExam` que já existe.
- `withQuestions(exam, questoes)` vira `withEdits(exam, { titulo, questoes })`, que também atualiza `atualizadoEm`. O único chamador é `Prova.tsx`.

### Novo módulo `src/lib/backup.ts` (testes em `backup.test.ts`)
- Formato: `{ app: 'provario', version: 1, exportadoEm, perfis: Profile[], provas: Exam[] }`. Os campos `app` e `version` servem para reconhecer o arquivo e permitir migrações no futuro.
- `createBackup(perfisData: unknown, provasData: unknown, agora): Backup` usa `listProfiles`/`listExams`, que já toleram dado corrompido.
- `backupFileName(agora: Date)` monta o nome com a data local.
- `parseBackup(texto): { ok: true, backup } | { ok: false, message }`, no padrão de resultado discriminado de `gemini.ts`/`examResponse.ts`. Mensagens em pt-BR para cada caso: o arquivo não é JSON; não é um backup do Provario; foi feito por uma versão mais nova; tem um perfil ou uma prova inválida; tem ids repetidos. A checagem de formato fica em `isProfile`/`isExam`: campos de texto, `params` com `serie` e `dificuldade` válidas, pelo menos uma questão, `alternativas` como `string[]` e `correta` como inteiro dentro da faixa. Para conferir as questões, reusa `validateQuestions`.
- `mergeById(atuais, importados)`: une os itens por `id` e, em conflito, fica o de `atualizadoEm` maior (no empate, fica o atual). Retorna também as contagens (novos e atualizados) para a mensagem de sucesso.
- `applyBackup(modo: 'substituir' | 'mesclar', atual, backup) → { perfis: ProfilesData, provas: ExamsData }` é puro.
- `restoreData(dados)` grava `PROFILES_KEY` e depois `EXAMS_KEY`. Se a segunda escrita lançar `StorageQuotaError`, regrava o valor anterior dos perfis e relança o erro, para que a importação nunca fique pela metade.
- `downloadJson(nome, dados)`: `Blob` + `URL.createObjectURL` + `<a download>` + `revokeObjectURL`. Grava o JSON sem indentação, porque as logos em base64 (também copiadas em cada snapshot de prova) deixam o arquivo grande.

### UI
- **`src/pages/Provas.tsx`** (rota `provas`, junto de `provas/nova` e `provas/:id` em `router.tsx`). Segue a estrutura de `Perfis.tsx`: título da página + botão "Nova prova", `Aviso` de retorno e uma lista de `ficha`. Cada ficha mostra o título no `ficha-cabecalho`, depois o conteúdo (com `line-clamp`), a série e as turmas, a escola e o perfil, e "Gerada em dd/mm/aaaa" (mais "editada em" quando for diferente). Embaixo ficam os botões Abrir, Duplicar e Excluir, com `aria-label` que inclui o título. Duplicar trata `StorageQuotaError` com um `Aviso` de erro e, se der certo, navega para a cópia com `state.aviso = 'Cópia criada. Edite o título e as questões se quiser.'`, que `Prova.tsx` já exibe.
- **`Layout.tsx`**: a aba passa a ser `{ to: '/provas', label: 'Provas' }`, sem `secao`. A regra de prefixo que já existe acende a aba em `/provas/nova` e em `/provas/:id`.
- **`Prova.tsx`**: guarda um `tituloRascunho` ao lado do rascunho das questões. Ele entra no cálculo de `pendente`, é validado (não pode ficar vazio, com o foco indo para o campo) e é salvo com `withEdits`. O campo usa o `CampoTexto` que já existe e fica acima do `EditorProva`. Quando a prova não é encontrada, a tela também mostra o link "Ver provas salvas".
- **`Configuracoes.tsx`**: nova seção `ficha`, "Backup dos dados", com um texto curto (o que entra no arquivo, que a chave não entra e quando fazer o backup) e dois botões:
  - "Exportar backup" baixa o arquivo e mostra o `Aviso` "Backup exportado: N perfis e M provas".
  - "Importar backup" é um `<input type="file" accept=".json,application/json">` escondido atrás de um botão. Arquivo inválido mostra um `Aviso` de erro. Arquivo válido abre um painel com o resumo ("Backup de 01/10/2026 com 2 perfis e 14 provas") e três botões: **Mesclar com os dados atuais**, **Substituir tudo** (abre um `ConfirmDialog` dizendo quantos perfis e provas atuais serão apagados) e **Cancelar**. Ao terminar, mostra um `Aviso` de sucesso com as contagens, ou o erro de espaço cheio.
- **`Icone.tsx`**: ganha os ícones `copiar`, `baixar` e `enviar`, com o mesmo traço reto dos outros.

## Arquivos
- Criar: `src/lib/backup.ts`, `src/lib/backup.test.ts`, `src/pages/Provas.tsx`, `src/pages/Provas.test.tsx`
- Alterar: `src/lib/exams.ts` (+ testes), `src/router.tsx`, `src/components/Layout.tsx`, `src/components/Icone.tsx`, `src/pages/Prova.tsx` (+ testes), `src/pages/Configuracoes.tsx` (+ testes), e talvez testes que procuram a aba "Nova prova" (verificar com grep)
- Docs: `docs/roadmap-provario.md` (Fase 6 → concluída), `CLAUDE.md` (`backup.ts`, a página Provas, o título editável), `docs/plans/fase-6-historico-e-backup.md` com o relatório de implementação no fim

## Passos de implementação (em ordem)
1. `exams.ts`: `sortExams`, `deleteExam`, `duplicateExam`, `withEdits` e os testes deles.
2. `backup.ts`: criar, analisar e validar, mesclar e aplicar, `restoreData` com rollback, `downloadJson`, e os testes.
3. `Icone.tsx`: os ícones novos.
4. `Provas.tsx` + a rota + a aba em `Layout.tsx`, e os testes da página (depende de 1 e 3).
5. Título editável em `Prova.tsx` e os testes (depende de 1).
6. Seção de backup em `Configuracoes.tsx` e os testes (depende de 2 e 3).
7. `npm run lint && npm test && npm run build`, conferência manual no `npm run dev` e atualização da documentação.

## Testes e critérios de aceite
- **Unitários (`exams.test.ts`, `backup.test.ts`):** ordenação; exclusão sem afetar as outras provas; a cópia tem id novo, título "(cópia)", datas novas e alterar a cópia não altera a original; ida e volta entre `createBackup` e `parseBackup`; as recusas (JSON inválido, `app` errado, `version` > 1, prova sem questões, `correta` fora da faixa, ids repetidos); mesclar (item novo, conflito decidido por `atualizadoEm`, empate); substituir; rollback de `restoreData` quando a escrita das provas falha (simular a `QuotaExceededError` em `localStorage.setItem`).
- **Página `Provas.test.tsx`** (com `routes` reais em `createMemoryRouter`, `provario:*` preenchido direto no storage): estado vazio com o link; lista na ordem mais recente primeiro com os campos visíveis; "Abrir" leva à prova; "Duplicar" cria a cópia no storage e abre a cópia, e editar e salvar a cópia mantém a original intacta; "Excluir" pede confirmação (cancelar mantém a prova, confirmar remove); a aba "Provas" fica ativa em `/provas`, `/provas/nova` e `/provas/:id`.
- **`Prova.test.tsx`:** editar o título e salvar persiste o título e atualiza a folha; título vazio impede salvar e leva o foco ao campo; mudar só o título já ativa o bloqueio de saída.
- **`Configuracoes.test.tsx`:** exportar chama `URL.createObjectURL` (com stub, já que o jsdom não tem) com um Blob cujo conteúdo é o backup; arquivo inválido mostra o erro e não altera os dados; mesclar e substituir (com confirmação) gravam o resultado esperado; teste do critério da fase: exportar → `localStorage.clear()` → importar o mesmo conteúdo com "Substituir" → perfis e provas idênticos aos originais.
- **Critérios do roadmap:** uma prova antiga pode ser reaberta, editada e reimpressa; duplicar gera uma cópia independente; exportar, limpar e importar restaura tudo. Conferência manual no navegador: download real do arquivo, importação depois de limpar os dados do site e impressão de uma prova reaberta.

## Riscos e pontos em aberto
- **Tamanho e espaço:** as logos em base64 se repetem em cada snapshot de prova, então mesclar pode passar da cota do `localStorage`. Isso é coberto pelo rollback e por uma mensagem clara. Deduplicar as logos fica fora do escopo.
- **Validação estrita:** se um único item estiver inválido, o arquivo inteiro é recusado. Isso é seguro para "restaurar por completo", mas um backup editado à mão pode ser recusado. A mensagem diz qual item falhou ("prova 3").
- **Exclusão de prova aberta em outra aba:** `Prova.tsx` já mostra "Prova não encontrada", então não há nada a fazer.
- **Em aberto:** um lembrete periódico de backup (por exemplo, a data do último export em Configurações) pode ser uma evolução futura, se a professora quiser.

## Relatório de implementação

**Data:** 2026-10-01
**Abordagem:** combinação. TDD nos helpers puros (`exams.ts`, `backup.ts`) e testes no estilo Dado/Quando/Então nas páginas, em vitest, sem dependências novas.
**Suíte:** 234 testes antes, 320 depois, todos passando. `npm run lint`, `tsc -b` e `npm run build` limpos.

| Item | Descrição (do plano) | Teste(s) | Resultado |
|---|---|---|---|
| P1 | `sortExams`, `deleteExam`, `duplicateExam` | `exams.test.ts` | ✅ passando |
| P2 | `withEdits` | `exams.test.ts::withEdits` | ✅ passando |
| P3 | Ida e volta `createBackup`/`parseBackup`; chave fora do arquivo | `backup.test.ts::createBackup / parseBackup` | ✅ passando |
| P4 | Recusas de arquivo inválido, com o item indicado | `backup.test.ts::parseBackup — recusas` | ✅ passando |
| P5 | `mergeById` e `applyBackup` | `backup.test.ts::mergeById`, `::applyBackup` | ✅ passando |
| P6 | Rollback de `restoreData` na cota cheia | `backup.test.ts::restoreData` | ✅ passando |
| P7 | Nome do arquivo e `downloadJson` | `backup.test.ts::backupFileName`, `::downloadJson` | ✅ passando |
| P8 | Lista e estado vazio em `#/provas` | `Provas.test.tsx::estado vazio`, `::lista` | ✅ passando |
| P9 | Abrir | `Provas.test.tsx::abrir` | ✅ passando |
| P10 | Duplicar, com original intacta | `Provas.test.tsx::duplicar` | ✅ passando |
| P11 | Excluir com confirmação | `Provas.test.tsx::excluir` | ✅ passando |
| P12 | Aba "Provas" ativa em `/provas`, `/provas/nova`, `/provas/:id` | `Provas.test.tsx::aba de navegação`, `NovaProva.test.tsx`, `Perfis.test.tsx` | ✅ passando |
| P13 | Título editável | `Prova.test.tsx::título editável` | ✅ passando |
| P14 | Link "Ver provas salvas" em prova não encontrada | `NovaProva.test.tsx::Prova — visualização` | ✅ passando |
| P15 | Exportar backup | `Configuracoes.test.tsx::exportar backup` | ✅ passando |
| P16 | Importar: validação e resumo | `Configuracoes.test.tsx::importar backup: validação` | ✅ passando |
| P17 | Mesclar, substituir e reversão por falta de espaço | `Configuracoes.test.tsx::mesclar e substituir` | ✅ passando |
| P18 | Exportar → limpar → importar restaura tudo | `Configuracoes.test.tsx::critério da fase` | ✅ passando |
| P19 | Ícones `copiar`, `baixar`, `enviar` | usados nos testes das páginas | ✅ passando |
| P20 | `CLAUDE.md` atualizado | verificação manual | ✅ feito |
| P21 | Download real, importação após limpar o site, impressão de prova reaberta | verificação manual no `npm run dev` | ⏳ a cargo da usuária |

**Desvios (detalhes de execução, sem mudança de escopo):**
- `applyBackup` devolve `{ dados, resumo }`, com as contagens de novos e atualizados.
- `storage.ts` ganhou `writeRaw`, usado no rollback de `restoreData`.
- `backup.ts` ganhou `readCurrentData()`.
- Testes antigos que procuravam a aba "Nova prova" passaram a procurar "Provas".
- Helper de módulo `agoraIso` em `Provas.tsx` por causa da regra de pureza do lint.
