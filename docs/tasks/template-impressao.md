# Tarefas — Feature 4: Template de impressão

Deriva de [../plans/template-impressao.md](../plans/template-impressao.md) e
[../specs/template-impressao.md](../specs/template-impressao.md).
Marcar `[x]` ao concluir. Sem ciclo TDD Vitest (constituição restringe o
Vitest ao parser); a verificação é a checklist QA manual da Etapa 4 mais a
suíte existente verde. `CAn` = critério de aceite da spec §6.

Legenda de estado: `[ ]` pendente · `[~]` em andamento · `[x]` concluída

## Etapa 1 — CSS da folha e da impressão

- [x] 1.1 `resources/css/app.css` — bloco `@layer components` com
  `.folha-impressao` de tela: `width:210mm; min-height:297mm; padding:15mm;
  margin:0 auto; background:#fff; color:#000; box-shadow` (plano §2.1)
- [x] 1.2 `resources/css/app.css` — bloco `@media print`: `@page { size:A4;
  margin:15mm }`; isolamento `body *{visibility:hidden}` +
  `.folha-impressao, .folha-impressao *{visibility:visible}`; override da
  `.folha-impressao` (`position:absolute; inset:0 auto auto 0; width:100%;
  min-height:0; margin:0; padding:0; box-shadow:none`)
- [x] 1.3 `resources/css/app.css` — no `@media print`:
  `.folha-questao{break-inside:avoid}` e `.folha-gabarito{break-before:page}`
- [x] 1.4 Verificação: `npm run build` compila o CSS sem erro

## Etapa 2 — `PassoPreview.vue`: folha A4

- [x] 2.1 `resources/js/components/prova/PassoPreview.vue` — trocar o `div`
  visual (`border rounded border p-6` + `dark:*`) pela classe
  `folha-impressao`; envolver em `<div class="folha-wrap overflow-x-auto">`
  (plano §2.2) — CA1
- [x] 2.2 Neutralizar cores que seguem o tema dentro da folha (header, título,
  `<dl>` do aluno, texto de fallback): usar tom fixo (a folha é sempre branca
  com texto preto), remover classes `dark:` do markup da folha — CA1
- [x] 2.3 Manter header institucional + `<h2>` do título + `<dl>` das linhas
  do aluno como estão (campos vazios já omitidos) — CA2, CA3
- [x] 2.4 Container das questões: classe `folha-questoes`, manter `:style`
  condicional `column-count:2; column-gap:2rem` para `layout===2`; trocar
  `flex flex-col gap-6` por espaçamento via `margin-bottom` nos
  `QuestaoPreview` (funciona com CSS columns) — CA4
- [x] 2.5 Bloco do gabarito: `<section class="folha-gabarito">` (manter
  `border-t pt-4 mt-6` para separador na tela); `GabaritoPreview` dentro — CA5
- [x] 2.6 Fallback "Nenhum markdown colado ainda." permanece dentro da folha,
  no lugar das questões — CA8

## Etapa 3 — `PassoPreview.vue`: botão Imprimir + `QuestaoPreview`

- [x] 3.1 `PassoPreview.vue` — `import Button from 'primevue/button'`; função
  `imprimir() { window.print() }`
- [x] 3.2 `PassoPreview.vue` — `<Button label="Imprimir" icon="pi pi-print"
  @click="imprimir" />` acima da `.folha-wrap`, sempre habilitado — CA6, CA8
- [x] 3.3 `PassoPreview.vue` — texto do `Message severity="info"`: orientar a
  conferir a folha, clicar em Imprimir e usar "Salvar como PDF" na caixa de
  impressão do navegador
- [x] 3.4 `PassoPreview.vue` — a lista de avisos (`Message` warn, um item por
  `AvisoParsing`) fica fora da `.folha-wrap`; some quando `avisos` vazio — CA9
- [x] 3.5 `resources/js/components/prova/QuestaoPreview.vue` — adicionar classe
  `folha-questao` ao wrapper (junto do utilitário `break-inside-avoid` já
  presente); `break-inside-avoid` também no `<ol>`/`<ul>` do miolo — CA7c

## Etapa 4 — Verificação

- [x] 4.1 `npm run types:check` limpo
- [x] 4.2 `npm run build` limpo
- [x] 4.3 `npm run test` — parser verde e inalterado (31 testes) — CA10
- [x] 4.4 `composer test` — PHP inalterado (51 testes) — CA10
- [x] 4.5 QA manual no Chrome (Passo 4, markdown do exemplo da constituição):
  folha A4 branca centralizada com sombra (CA1); cabeçalho com campos do
  Passo 3 + logo, vazios omitidos (CA2); linhas do aluno (CA3); questões com
  `**negrito**`/`*itálico*`, 1 e 2 colunas conforme Passo 3 (CA4); gabarito ao
  final, uma linha por questão (CA5); botão "Imprimir" abre a caixa (CA6)
- [x] 4.6 QA manual — pré-visualização de impressão (Ctrl+P): só a folha, sem
  sidebar/topbar/PageHeader/stepper/avisos/botões (CA7a); papel A4 (CA7b);
  nenhuma questão partida entre páginas ou colunas (CA7c); gabarito começa em
  página nova, sozinho (CA7d)
- [x] 4.7 QA manual — markdown vazio: folha com cabeçalho + linhas do aluno +
  "Nenhum markdown colado ainda."; botão "Imprimir" ainda funciona (CA8)
- [x] 4.8 Isolamento por `visibility` não cortou conteúdo multipágina no
  Chrome — fallback do plano §5 não foi necessário

## Progresso

- Etapas 1–3 concluídas: CSS de folha/impressão em `resources/css/app.css`;
  `PassoPreview.vue` reescrito (folha `.folha-impressao` em wrap
  `overflow-x-auto`, cores fixas preto/branco, botão "Imprimir" via
  `window.print()`, `section.folha-gabarito`, espaçamento das questões por
  `mb-6`); `QuestaoPreview.vue` com classe `folha-questao` e
  `break-inside-avoid` no `<ol>`/`<ul>`.
- Etapa 4 automatizada verde: `types:check`, `build`, `npm run test` (31),
  `composer test` (51 testes, phpstan 0 erros, pint passed).
- Etapa 4 QA manual (4.5–4.8) validada pelo usuário em 2026-09-03: folha A4,
  cabeçalho, linhas do aluno, questões 1/2 colunas, gabarito, botão Imprimir,
  pré-visualização só com a folha, sem corte multipágina. Fallback §5 não
  necessário.

**Feature 4 concluída — todas as tarefas [x].**
