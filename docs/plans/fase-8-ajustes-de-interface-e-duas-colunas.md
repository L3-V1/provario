---
titulo: Provario — Fase 8: Ajustes de interface e folha em duas colunas
data: 2026-10-02
status: implementado
---

# Plano — Provario, Fase 8: Ajustes de interface e folha em duas colunas

## Contexto
As Fases 1 a 7 estão concluídas. Usando o app, a professora apontou três ajustes:
1. A linha divisória do **cabeçalho da prova**, entre *Aluno(a)/Nº* e *Turma/Data/Nota*, para antes de chegar debaixo do *Nº*. **Causa:** em `src/components/FolhaProva.tsx`, o cabeçalho é uma grade de 4 colunas, mas a 2ª linha só tem 3 campos. A linha é a `border-t-2` de cada campo, então a 4ª coluna fica sem ela.
2. O **verde principal** (`santos`, `#006b3a`) está escuro demais.
3. Muitas vezes a prova precisa caber numa folha só (sem contar o gabarito). Falta a opção de imprimir as questões em **duas colunas**.

Decisões tomadas com a usuária (termos em `GLOSSARY.md`):
- **Cabeçalho:** *Turma*, *Data* e *Nota* ganham uma faixa própria em três partes iguais, e a linha atravessa a folha inteira. A 1ª linha (*Aluno(a)* + *Nº*) continua igual.
- **Verde:**
  - `santos` passa para `#007a42` (contraste 5,4:1 com branco).
  - `santos-escuro` e `santos-claro` acompanham na mesma proporção.
  - `tinta` e `capa` ficam como estão.
- **Colunas da folha:**
  - Cada prova guarda se está em uma ou duas colunas. É escolha de diagramação, não parâmetro de geração.
  - **Prova nova:** começa sempre em uma coluna.
  - **Provas e backups antigos:** sem a informação, abrem em uma coluna.
  - **Controle:** seletor "1 coluna | 2 colunas" na barra de ações, ao lado de "Imprimir / Salvar PDF", travado durante a edição.
  - **Salvamento:** grava na hora (fora do rascunho) e atualiza `atualizadoEm`.
  - **Ordem:** as questões seguem como jornal (coluna da esquerda de cima a baixo, depois a da direita), sem cortar nenhuma questão.
  - **Aparência:** fio vertical fino entre as colunas e espaço entre questões um pouco menor. A fonte não muda.
  - **O que não muda:** o cabeçalho, o título e o gabarito.
  - **Tela:** a pré-visualização mostra duas colunas a partir de `sm`. No celular fica em uma coluna. A impressão sempre respeita a escolha.

## Objetivo e escopo
**Entra:** as correções do cabeçalho e do verde, o campo de colunas na prova, o seletor na página da prova, a folha em duas colunas na tela e na impressão, a compatibilidade com dados antigos e os testes.

**Fica de fora:**
- Fonte menor ou modo "compacto".
- Mais de duas colunas.
- Gabarito em colunas.
- Lembrar a última escolha para provas novas.
- Escolher as colunas no formulário de geração.
- Ajuste automático para caber numa página.

## Abordagem técnica e decisões

### `src/index.css`: verde
- `--color-santos: #007a42`.
- `--color-santos-escuro: #005a30`, usado no hover do botão primário e no texto de `.link` e do `Aviso` de sucesso. Contraste de 8,4:1 com branco e de 6,7:1 sobre o marca-texto.
- `--color-santos-claro: #dbf0e1`, um fundo claro no novo matiz. O `Aviso` de sucesso usa `border-santos` sobre ele.
- Nada mais muda: `outline` de foco, `accent-santos` e o título "Provario" do `Layout` herdam pelo token.

### `src/components/FolhaProva.tsx`: cabeçalho
- O bloco de campos vira duas faixas:
  - `div.grid.sm:grid-cols-4.border-t-2` com *Aluno(a)* (`sm:col-span-3`) e *Nº* (`sm:border-l-2`).
  - `div.grid.sm:grid-cols-3.border-t-2` com *Turma*, *Data* (`sm:border-l-2`) e *Nota* (`sm:border-l-2`).
- No celular, onde tudo fica empilhado, as bordas de cima dos campos continuam como hoje. A linha cheia vem da borda da segunda faixa, não dos campos.
- `Campo` não muda.

### `src/lib/exams.ts`: colunas da folha
- `export type ColunasFolha = 1 | 2`.
- `Exam` ganha `colunas?: ColunasFolha`. O campo é opcional porque provas antigas não o têm; ausente equivale a 1.
- `colunasDaFolha(exam: Exam): ColunasFolha` devolve `2` só se `exam.colunas === 2`, senão `1`. Assim, um valor corrompido ou vindo de backup também vira 1.
- `withColunas(exam, colunas): Exam` devolve `{ ...exam, colunas, atualizadoEm: new Date().toISOString() }`, no mesmo molde de `withEdits`.
- `createExam` não muda (nasce sem o campo, ou seja, em uma coluna). `duplicateExam` já copia por `...exam`.
- `src/lib/backup.ts` não muda: `isExam` ignora campos a mais, e a leitura passa sempre por `colunasDaFolha`. O `mergeById` já usa `atualizadoEm`, que `withColunas` atualiza.

### `src/components/FolhaProva.tsx`: questões em colunas
- Lê `const duas = colunasDaFolha(prova) === 2`.
- O `<ol aria-label="Questões">`:
  - **Uma coluna:** `space-y-5`, como hoje.
  - **Duas colunas:** `sm:columns-2 print:columns-2 gap-x-8 [column-rule:1px_solid_var(--color-tinta)]`. Em vez de `space-y`, usa `mb-4` em cada `li`, porque `space-y` deixa uma margem no topo da 2ª coluna.
- Cada `li` mantém `break-inside-avoid`, para que uma questão não se parta entre colunas nem entre páginas.
- O `<article>` ganha `data-colunas={duas ? 2 : 1}`, que facilita os testes e é inerte no CSS.

### `src/pages/Prova.tsx`: seletor
- Na barra de ações, depois de "Imprimir / Salvar PDF", vai um `fieldset` com `legend` "Colunas da folha" (visualmente discreta) e dois `input type="radio"`: "1 coluna" e "2 colunas".
  - Ficam estilizados como botões segmentados com as classes do projeto (`border-2 border-tinta`, `bg-santos text-white` no marcado, `shadow-relevo-sm`). O padrão de radio é o mesmo de `EditorProva.tsx` e `NovaProva`.
  - O `fieldset` fica `disabled={editando}`.
- `onChange` chama `trocarColunas(c)`:
  - `writeItem(EXAMS_KEY, updateExam(readItem(...), withColunas(prova, c)))`.
  - O bloco `try/catch` de `StorageQuotaError` é o mesmo de `salvar()`. No erro, mostra `MSG_ARMAZENAMENTO_CHEIO` num `Aviso` de erro (novo estado `erroColunas`).
- A folha re-renderiza pelo `useStoredState`.
- Não mexe em `pendente` nem no `useBlocker`, porque a troca não passa pelo rascunho.

## Arquivos
- **Alterados:** `src/index.css`, `src/components/FolhaProva.tsx`, `src/lib/exams.ts`, `src/pages/Prova.tsx`.
- **Testes:** `src/lib/exams.test.ts`, `src/lib/backup.test.ts`, `src/pages/Prova.test.tsx`.
- **Docs:**
  - `CLAUDE.md`: uma linha sobre colunas da folha em `exams.ts`/`FolhaProva`.
  - `docs/roadmap-provario.md`: registrar os ajustes.
  - `GLOSSARY.md`, já criado.

## Passos de implementação (em ordem)
1. **Testes de `exams.ts` (vermelho):**
   - `colunasDaFolha` com ausente, 1, 2 e um valor inválido (`3`, `'2'`).
   - `withColunas` troca o valor e atualiza `atualizadoEm` sem tocar no resto.
   - `duplicateExam` preserva `colunas`.
2. Implementar o tipo, `colunasDaFolha` e `withColunas`.
3. **Teste de `backup.ts`:** um backup com prova sem `colunas` e outro com `colunas: 2` são aceitos, e o valor é preservado no `applyBackup`.
4. **Testes de `Prova` (vermelho), em BDD:**
   - Cabeçalho: os campos *Turma*, *Data* e *Nota* ficam numa faixa própria, separada da faixa *Aluno(a)/Nº*.
   - Dada uma prova sem `colunas`, o seletor marca "1 coluna" e a folha tem `data-colunas="1"`.
   - Quando escolhe "2 colunas", grava `colunas: 2` no `localStorage`, atualiza `atualizadoEm` e a lista de questões ganha as classes de duas colunas.
   - Durante a edição, o seletor fica desabilitado.
   - Com o armazenamento cheio, a troca mostra o erro e não grava.
   - O gabarito não muda com duas colunas.
5. Implementar o cabeçalho em duas faixas e as colunas em `FolhaProva`.
6. Implementar o seletor em `Prova.tsx`.
7. Trocar os tokens de verde em `index.css`.
8. Atualizar o `CLAUDE.md` e o roadmap e escrever o relatório de implementação ao final deste plano.

## Testes e critérios de aceite
- `npm test`, `npm run lint` e `npm run build` limpos.
- **Conferência visual (Playwright/Chromium, `npm run dev`), com uma prova de 10 questões:**
  - Na tela e com `emulateMedia print`, a linha entre *Aluno(a)/Nº* e *Turma/Data/Nota* vai de borda a borda.
  - Em "2 colunas", as questões descem pela coluna da esquerda e depois pela da direita, com o fio entre elas e nenhuma questão partida.
  - Ao imprimir, o gabarito continua em página separada.
  - Em 375 px, a folha fica em uma coluna e não há rolagem horizontal.
  - Botões primários, links, `Aviso` de sucesso e foco aparecem no novo verde, e o contraste do texto branco nos botões fica ≥ 4,5:1.
- **Persistência:** recarregar a página mantém a escolha. Duplicar a prova leva a escolha junto. Exportar e importar backup preserva a escolha. Um backup antigo abre em uma coluna.

## Riscos e pontos em aberto
- **jsdom não calcula colunas CSS:** os testes conferem classes e atributos, e a ordem visual "como jornal" fica para a conferência no Chromium.
- **`break-inside: avoid` com uma questão muito longa:** se a questão não couber numa coluna, o navegador pode quebrá-la mesmo assim. É raro com 4–5 alternativas curtas e é aceito.
- **Fio de coluna na impressão:** `column-rule` imprime bem no Chromium. No Firefox, conferir se não some com "imprimir fundos" desligado, porque é borda, não fundo.

## Relatório de implementação

**Data:** 2026-10-02
**Abordagem:** combinação de TDD (`exams.ts`, `backup.ts`) e BDD (página `Prova`), no próprio Vitest. Os testes novos de `exams.ts` e `Prova` foram vistos falhando antes do código. Os de backup e o do gabarito já passavam, porque esses trechos não mudam.
**Resultado:** 396 testes passando (382 antes), `npm run lint` e `npm run build` limpos.

| Item | Descrição | Teste(s) | Resultado |
|---|---|---|---|
| P1 | `colunasDaFolha`: ausente, 1, 2 e inválido | `exams.test.ts::colunasDaFolha` | ✅ |
| P2 | `withColunas` troca o valor e renova `atualizadoEm` | `exams.test.ts::withColunas` | ✅ |
| P3 | `duplicateExam` preserva `colunas` | `exams.test.ts::duplicateExam › preserva as colunas da folha` | ✅ |
| P4 | Backup com e sem `colunas` aceito e preservado | `backup.test.ts::colunas da folha no backup` | ✅ |
| P5 | Turma, Data e Nota numa faixa própria | `Prova.test.tsx::Turma, Data e Nota ficam numa faixa própria…` | ✅ |
| P6 | Prova sem `colunas` marca "1 coluna" | `Prova.test.tsx::Prova — colunas da folha` | ✅ |
| P7 | "2 colunas" grava e aplica as classes | `Prova.test.tsx::Prova — colunas da folha` | ✅ |
| P8 | Voltar para "1 coluna" grava `colunas: 1` | `Prova.test.tsx::Prova — colunas da folha` | ✅ |
| P9 | Seletor desabilitado na edição | `Prova.test.tsx::Prova — colunas da folha` | ✅ |
| P10 | Armazenamento cheio mostra erro e não grava | `Prova.test.tsx::Prova — colunas da folha` | ✅ |
| P11 | Gabarito não muda | `Prova.test.tsx::Prova — colunas da folha` | ✅ |
| P12 | Novo verde | verificação manual | ✅ confirmado pela usuária |
| P13 | Conferência visual no Chromium (tela e 375 px) | verificação manual | ✅ |
| P14 | `CLAUDE.md` e roadmap | verificação manual | ✅ |

**Desvios aprovados:** nenhum.
