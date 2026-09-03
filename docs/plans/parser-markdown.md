# Plano de implementação — Feature 3: Parser do markdown

Baseado em [../specs/parser-markdown.md](../specs/parser-markdown.md).
TDD RED-GREEN-REFACTOR no parser (Vitest); integração de frontend verificada por
`npm run types:check` + `npm run build`. Nenhuma mudança de backend (rota,
controller, model, migration, `localStorage`).

## Decisões técnicas resolvidas (pontos "aprovação pendente" da spec)

### Vitest — configuração

- Dependência: `vitest` (só ela; sem `@vue/test-utils`, sem `vite-tsconfig-paths`).
- Arquivo **próprio** `vitest.config.ts` na raiz, usando `defineConfig` de
  `vitest/config` — **não** reaproveita `vite.config.ts` (que roda via
  `vite-plus` e carrega o plugin do Laravel, fontes etc., irrelevantes ao teste).

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        include: ['resources/js/**/*.test.ts'],
    },
});
```

- Sem `globals: true`. Cada teste importa `{ describe, it, expect }` de `vitest`
  (evita mexer em `tsconfig.json` / `types`).
- `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
- `composer.json` → `ci:check`: acrescentar `"npm run test"` após `npm run types:check`.
- `CLAUDE.md` seção Comandos: adicionar linha `npm run test  # vitest (parser)`.
- `tsconfig.json` já cobre `resources/js/**/*.ts` → o `.test.ts` entra no
  `types:check`; ok, pois importa tipos de `vitest`.
- `vite.config.ts` `lint` é `typeAware` com `denyWarnings` → `vitest.config.ts` e
  o `.test.ts` precisam passar em `npm run check`. Manter import order e aspas
  simples conforme `fmt`.

### Catálogo de avisos — códigos e mensagens pt_BR

`codigo` estável (não traduzir); `mensagem` exibida no preview. `{n}` = número
da questão.

| Código                              | Mensagem                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `SEM_QUESTOES`                      | `Nenhuma questão reconhecida no markdown colado.`                                           |
| `CONTEUDO_IGNORADO_ANTES`           | `Há texto antes da primeira questão; ele foi ignorado.`                                     |
| `SECAO_DESCONHECIDA`                | `Seção "{titulo}" não é reconhecida e foi ignorada.`                                        |
| `CABECALHO_QUESTAO_MALFORMADO`      | `Cabeçalho de questão mal formado: "{linha}".`                                              |
| `TIPO_QUESTAO_DESCONHECIDO`         | `Questão {n}: tipo "{tipo}" não é suportado (use múltipla escolha ou verdadeiro ou falso).` |
| `NUMERACAO_INESPERADA`              | `Numeração das questões fora da sequência esperada (1, 2, 3...).`                           |
| `MULTIPLA_ESCOLHA_SEM_ALTERNATIVAS` | `Questão {n}: nenhuma alternativa (a–e) encontrada.`                                        |
| `ALTERNATIVAS_INSUFICIENTES`        | `Questão {n}: menos de 2 alternativas.`                                                     |
| `ALTERNATIVA_FORA_DE_ORDEM`         | `Questão {n}: alternativas fora de ordem ou repetidas.`                                     |
| `VF_SEM_AFIRMACOES`                 | `Questão {n}: nenhuma afirmação no formato "N. ( ) texto".`                                 |
| `GABARITO_AUSENTE`                  | `Seção "## Gabarito" não encontrada.`                                                       |
| `GABARITO_INCOMPLETO`               | `Questão {n}: sem resposta no gabarito.`                                                    |
| `GABARITO_NAO_RECONHECIDO`          | `Questão {n}: resposta do gabarito não reconhecida.`                                        |
| `GABARITO_VF_DIVERGENTE`            | `Questão {n}: as respostas do gabarito não batem com as afirmações.`                        |
| `GABARITO_SOBRANDO`                 | `Gabarito traz a resposta {n}, mas não existe questão {n}.`                                 |
| `QUANTIDADE_DIVERGENTE`             | `Foram pedidas {esperado} questões, mas o markdown tem {encontrado}.`                       |

Mensagens ficam em uma função `mensagemAviso(codigo, params)` interna ao módulo
do parser, ou montadas na hora — decisão de implementação, sem impacto na API.

## Arquivos afetados

### Novos

| Arquivo                                             | Papel                                         |
| --------------------------------------------------- | --------------------------------------------- |
| `vitest.config.ts`                                  | config do Vitest (acima)                      |
| `resources/js/lib/parserProva.ts`                   | `parseProva()` + segmentação inline           |
| `resources/js/lib/parserProva.test.ts`              | suíte Vitest do parser                        |
| `resources/js/components/prova/TextoFormatado.vue`  | renderiza `SegmentoTexto[]` → `<strong>/<em>` |
| `resources/js/components/prova/QuestaoPreview.vue`  | uma questão (MC ou V/F) na tela               |
| `resources/js/components/prova/GabaritoPreview.vue` | bloco de gabarito na tela                     |

Nota: `segmentar()` pode ficar no próprio `parserProva.ts` (export nomeado) — não
criar `textoFormatado.ts` separado a menos que o arquivo cresça demais. Decisão
na implementação; testes importam de onde estiver.

### Alterados

| Arquivo                                          | Mudança                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `resources/js/types/prova.ts`                    | acrescenta os tipos da seção 2 da spec                            |
| `resources/js/components/prova/PassoPreview.vue` | prop `quantidade`; troca `<pre>` por avisos + questões + gabarito |
| `resources/js/pages/prova/Criar.vue`             | passa `:quantidade="rascunho.config.quantidade"`                  |
| `package.json`                                   | scripts `test` / `test:watch`; devDep `vitest`                    |
| `composer.json`                                  | `ci:check` roda `npm run test`                                    |
| `CLAUDE.md`                                      | seção Comandos: `npm run test`                                    |

## Ordem das etapas

### Etapa 1 — Vitest + tipos

- `npm i -D vitest`; criar `vitest.config.ts`; scripts em `package.json`.
- Acrescentar tipos em `resources/js/types/prova.ts` (seção 2 da spec).
- Smoke test: `resources/js/lib/parserProva.test.ts` com um `it` trivial →
  `npm run test` verde (prova que o runner e o alias `@` funcionam).
- Verificação: `npm run test`, `npm run types:check`, `npm run check`.

### Etapa 2 — Segmentação inline (`segmentar`) — TDD

- RED: casos da spec §6 "Formatação inline":
  `**negrito**`, `*itálico*`, `***ambos***`, misto, `**` sem par, e marcadores
  não suportados (`#`, `-`, `` ` ``, `[x](y)`, `| a | b |`, `_x_`) como texto puro.
- GREEN: implementar `segmentar(texto): TextoFormatado`.
    - Tokenizador linear: varre a string procurando, nesta ordem, `***…***`,
      `**…**`, `*…*` com fechamento **na mesma chamada** (texto de uma linha
      lógica já unida). Sem par → o delimitador é literal.
    - Sempre retorna ao menos `[{ texto: '' }]`.
- REFACTOR: `npm run check` + `types:check`.

### Etapa 3 — Estrutura de blocos e questões — TDD

- RED: caminho feliz (exemplo completo da constituição) + parciais:
  markdown vazio (`SEM_QUESTOES`), tipo desconhecido, MC sem/1 alternativa,
  alternativas fora de ordem, V/F sem afirmações, numeração `1,3`,
  texto antes da questão 1, `## Anexo` no meio, normalização `\r\n`.
- GREEN: `parseProva()` — fases 3.1→3.4 da spec (sem gabarito ainda; `gabarito`
  fica `null` / `AfirmacaoVF.gabarito` `null`).
- REFACTOR.

### Etapa 4 — Gabarito e quantidade — TDD

- RED: gabarito ausente, incompleto, `1. xyz` (não reconhecido), V/F divergente,
  `3. a` sobrando, e `quantidadeEsperada` divergente / batendo.
- GREEN: fases 3.5 e 3.6 da spec.
- REFACTOR. Suíte inteira verde; `npm run check` + `types:check`.

### Etapa 5 — Componentes de preview (frontend, sem Vitest)

- `TextoFormatado.vue`: `v-for` nos segmentos; `<strong>`, `<em>`,
  `<strong><em>` aninhados, ou `<span>`. Sem `v-html`.
- `QuestaoPreview.vue`: título "Questão {numero}", enunciado via
  `TextoFormatado`, e por tipo:
    - MC: `<ol>`/lista com `a) ` + `TextoFormatado` da alternativa.
    - V/F: lista `{numero}. ( ) ` + `TextoFormatado`.
- `GabaritoPreview.vue`: `v-for` nas questões → `"{numero}. {resposta}"`, onde
  `resposta` = letra (MC) ou `"1-V, 2-F"` derivado das afirmações; `—` quando `null`.
- Verificação: `npm run build` + `types:check`.

### Etapa 6 — Integração no Passo 4

- `PassoPreview.vue`:
    - nova prop `quantidade: number | null`.
    - `computed` `prova = parseProva(props.markdown, { quantidadeEsperada: props.quantidade })`.
    - Se `markdown` vazio → mantém texto "Nenhum markdown colado ainda." e não
      renderiza avisos.
    - Bloco de avisos: `v-if="prova.avisos.length"`, `Message severity="warn"`,
      um por aviso (`variant="simple"`, lista).
    - Container das questões reflete `layout` (CSS `columns` como hoje).
    - `<GabaritoPreview>` ao final (título "Gabarito").
    - Mantém o `Message severity="info"` avisando que A4/impressão vêm depois.
- `Criar.vue`: `:quantidade="rascunho.config.quantidade"` no `<PassoPreview>`.
- Verificação: `npm run build` + `types:check` + `npm run check`.

### Etapa 7 — Fechamento

- `composer.json` `ci:check` + `CLAUDE.md`.
- Rodar tudo: `npm run test`, `npm run check`, `npm run types:check`,
  `npm run build`, `composer test` (backend intacto).
- Atualizar `docs/constitution/provario.md` tabela de features:
  `parser-markdown` → Status **Concluída**.
- Marcar progresso em `docs/tasks/parser-markdown.md`.

## Riscos e mitigações

| Risco                                                                 | Mitigação                                                                                                                                     |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest` puxa build do Vite via `vite.config.ts` (vite-plus)          | `vitest.config.ts` isolado com `defineConfig` de `vitest/config`                                                                              |
| Lint `typeAware`/`denyWarnings` barra os arquivos de teste            | seguir `fmt` (aspas simples, `printWidth 80`, import order) desde o começo                                                                    |
| Ambiguidade do enunciado multi-linha vs. início das alternativas      | regra fixa: enunciado termína na 1ª linha que casa `a)` (MC) ou `N. ( )` (V/F)                                                                |
| Acentos no tipo (`múltipla` vs `multipla`)                            | normalizar (`toLowerCase` + remover diacríticos) antes de comparar                                                                            |
| `segmentar` com `*` de multiplicação em texto de matemática (`2 * 3`) | par `*…*` exige conteúdo não vazio e sem espaço colado ao delimitador interno; caso contrário literal. Definir na Etapa 2 e cobrir com teste. |
| Vue-tsc reclamar do union `Questao` em `QuestaoPreview`               | discriminar por `questao.tipo` com `v-if` e narrowing; props tipadas                                                                          |

## Fora do escopo (reafirmando a spec)

A4 / `@media print` / `window.print()` / gabarito paginado (feature 4); testes
Vitest de componentes ou de `buildPromptProva` / `useRascunhoProva`; mudança de
backend; markdown além de negrito/itálico.
