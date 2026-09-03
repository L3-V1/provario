# Tarefas — Feature 3: Parser do markdown

Deriva de [../plans/parser-markdown.md](../plans/parser-markdown.md) e
[../specs/parser-markdown.md](../specs/parser-markdown.md).
Marcar `[x]` ao concluir. TDD: tarefas RED antes das GREEN correspondentes.

Legenda de estado: `[ ]` pendente · `[~]` em andamento · `[x]` concluída

## Etapa 1 — Vitest + tipos

- [x] 1.1 `npm i -D vitest`
- [x] 1.2 `vitest.config.ts` na raiz — `defineConfig` de `vitest/config`, alias `@` → `resources/js` via `fileURLToPath`, `test.environment='node'`, `test.include=['resources/js/**/*.test.ts']`
- [x] 1.3 `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`
- [x] 1.4 `resources/js/types/prova.ts` — acrescenta `SegmentoTexto`, `TextoFormatado`, `LetraAlternativa`, `Alternativa`, `QuestaoMultiplaEscolha`, `AfirmacaoVF`, `QuestaoVerdadeiroFalso`, `Questao`, `AvisoParsing`, `ProvaParseada`, `OpcoesParse` (spec §2)
- [x] 1.5 `resources/js/lib/parserProva.test.ts` — smoke test (`it` trivial importando de `vitest`)
- [x] 1.6 Verificação: `npm run test`, `npm run types:check`, `npm run check` limpos

## Etapa 2 — Segmentação inline (`segmentar`) — TDD

- [x] 2.1 RED: `**negrito**` → `[{texto,negrito:true}]`
- [x] 2.2 RED: `*itálico*` → `italico:true`; `***ambos***` → `negrito+italico`
- [x] 2.3 RED: texto misto (antes/depois/entre marcadores) segmenta certo
- [x] 2.4 RED: `**` sem fechamento na linha → literal
- [x] 2.5 RED: `2 * 3` (espaços colados ao `*`) → literal, não itálico
- [x] 2.6 RED: `#`, `- item`, `` `código` ``, `_x_`, `[x](y)`, `![x](y)`, `| a | b |` → texto puro
- [x] 2.7 RED: entrada vazia → `[{ texto: '' }]`
- [x] 2.8 GREEN: implementar `segmentar(texto: string): TextoFormatado` (export de `parserProva.ts`)
- [x] 2.9 REFACTOR: `npm run check` + `types:check`

## Etapa 3 — Estrutura de blocos e questões — TDD

- [x] 3.1 RED: exemplo completo da constituição → 2 questões, tipos `multipla-escolha` / `verdadeiro-falso`, enunciados segmentados
- [x] 3.2 RED: MC → 4 alternativas com `letra` a–d e `texto` segmentado
- [x] 3.3 RED: V/F → 2 afirmações com `numero` 1..2 e `texto` segmentado
- [x] 3.4 RED: markdown vazio / só espaços → `SEM_QUESTOES`, `questoes: []`
- [x] 3.5 RED: `## Questão 1 (charada)` → `TIPO_QUESTAO_DESCONHECIDO`
- [x] 3.6 RED: `## Questão (múltipla escolha)` sem número → `CABECALHO_QUESTAO_MALFORMADO`
- [x] 3.7 RED: MC sem `a)`–`e)` → `MULTIPLA_ESCOLHA_SEM_ALTERNATIVAS`, questão só com enunciado
- [x] 3.8 RED: MC com 1 alternativa → `ALTERNATIVAS_INSUFICIENTES`
- [x] 3.9 RED: alternativas `a) c) b)` → `ALTERNATIVA_FORA_DE_ORDEM`, todas incluídas na ordem lida
- [x] 3.10 RED: V/F sem linhas `N. ( )` → `VF_SEM_AFIRMACOES`
- [x] 3.11 RED: numeração `1, 3` → `NUMERACAO_INESPERADA`
- [x] 3.12 RED: texto solto antes da 1ª questão → `CONTEUDO_IGNORADO_ANTES`
- [x] 3.13 RED: `## Anexo` no meio → `SECAO_DESCONHECIDA` (título na mensagem), bloco ignorado
- [x] 3.14 RED: entrada com `\r\n` e espaços à direita → parse idêntico ao `\n` limpo
- [x] 3.15 RED: enunciado multi-linha termina na 1ª linha `a)` / `N. ( )`
- [x] 3.16 GREEN: `parseProva(markdown, opcoes?)` — normalização, split por `## `, classificação de cabeçalho, parse MC e V/F (spec §3.1–3.4). `gabarito` fica `null`
- [x] 3.17 REFACTOR: `npm run check` + `types:check`

## Etapa 4 — Gabarito e quantidade — TDD

- [x] 4.1 RED: exemplo da constituição → `gabarito: 'c'` na Q1; afirmações da Q2 `V`/`F`; `avisos` vazio
- [x] 4.2 RED: sem `## Gabarito` → um único `GABARITO_AUSENTE`
- [x] 4.3 RED: gabarito sem a linha de uma questão → `GABARITO_INCOMPLETO` (com `questao` certo)
- [x] 4.4 RED: MC `1. xyz` → `GABARITO_NAO_RECONHECIDO`, `gabarito: null`
- [x] 4.5 RED: V/F `2. 1-V` para questão de 2 afirmações → `GABARITO_VF_DIVERGENTE`
- [x] 4.6 RED: V/F aceita variações (`1: v`, `1 V`, espaços) → afirmações preenchidas
- [x] 4.7 RED: `3. a` sem questão 3 → `GABARITO_SOBRANDO`
- [x] 4.8 RED: `quantidadeEsperada: 2` no exemplo → sem `QUANTIDADE_DIVERGENTE`
- [x] 4.9 RED: `quantidadeEsperada: 5` com 3 questões → `QUANTIDADE_DIVERGENTE` (cita 5 e 3), questões entregues
- [x] 4.10 GREEN: fases spec §3.5–3.6 (parse do gabarito MC e V/F, checagem de quantidade)
- [x] 4.11 REFACTOR: suíte inteira verde; `npm run check` + `types:check`

## Etapa 5 — Componentes de preview (sem Vitest)

- [x] 5.1 `resources/js/components/prova/TextoFormatado.vue` — prop `segmentos: TextoFormatado`; `<span>`/`<strong>`/`<em>` (negrito+itálico aninhados); sem `v-html`
- [x] 5.2 `resources/js/components/prova/QuestaoPreview.vue` — prop `questao: Questao`; título "Questão {numero}", enunciado via `TextoFormatado`; narrowing por `questao.tipo`
- [x] 5.3 `QuestaoPreview.vue` — MC: lista `a) ` + `TextoFormatado` da alternativa
- [x] 5.4 `QuestaoPreview.vue` — V/F: lista `{numero}. ( ) ` + `TextoFormatado`
- [x] 5.5 `resources/js/components/prova/GabaritoPreview.vue` — prop `questoes: Questao[]`; linha `"{numero}. {resposta}"` (letra MC / `"1-V, 2-F"` V/F / `—` quando `null`)
- [x] 5.6 Verificação: `npm run build` + `types:check`

## Etapa 6 — Integração no Passo 4

- [x] 6.1 `PassoPreview.vue` — nova prop `quantidade: number | null`
- [x] 6.2 `PassoPreview.vue` — `computed` `prova = parseProva(markdown, { quantidadeEsperada: quantidade })`
- [x] 6.3 `PassoPreview.vue` — `markdown` vazio → texto "Nenhum markdown colado ainda.", sem avisos
- [x] 6.4 `PassoPreview.vue` — bloco de avisos `v-if="prova.avisos.length"`, `Message severity="warn"`, um por aviso
- [x] 6.5 `PassoPreview.vue` — `<QuestaoPreview>` por questão no container que reflete `layout` (CSS `columns`)
- [x] 6.6 `PassoPreview.vue` — `<GabaritoPreview>` ao final (título "Gabarito")
- [x] 6.7 `PassoPreview.vue` — mantém `Message severity="info"` (A4/impressão vêm na feature 4); remove o `<pre>`
- [x] 6.8 `Criar.vue` — passa `:quantidade="rascunho.config.quantidade"` ao `<PassoPreview>`
- [x] 6.9 Verificação: `npm run build` + `types:check` + `npm run check`

## Etapa 7 — Fechamento

- [x] 7.1 `composer.json` `ci:check` — acrescenta `npm run test` após `npm run types:check`
- [x] 7.2 `CLAUDE.md` seção Comandos — linha `npm run test  # vitest (parser)`
- [x] 7.3 Rodar `npm run test`, `npm run check`, `npm run types:check`, `npm run build`, `composer test` — tudo verde
- [x] 7.4 `docs/constitution/provario.md` — tabela de features: `parser-markdown` → Status **Concluída**
- [x] 7.5 Revisar rastreabilidade: cada critério de aceite da spec coberto por teste ou verificação

## Rastreabilidade (spec → tarefas)

| Item da spec                            | Tarefas               |
| --------------------------------------- | --------------------- |
| Contrato `parseProva` / retorno parcial | 3.16, 4.10            |
| Formatação inline (segmentos)           | 2.1–2.9, 5.1          |
| Catálogo de avisos                      | 3.4–3.13, 4.2–4.9     |
| Estrutura de blocos / MC / V/F          | 3.1–3.16              |
| Gabarito MC e V/F                       | 4.1, 4.3–4.7, 4.10    |
| Quantidade divergente                   | 4.8, 4.9              |
| Render real no Passo 4                  | 5.1–5.6, 6.1–6.8      |
| Lista de avisos no preview              | 6.4                   |
| Vitest só para o parser                 | 1.1–1.2, 7.1          |
| Backend intacto                         | 7.3 (`composer test`) |
