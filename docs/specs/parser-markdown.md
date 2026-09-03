# Especificação — Feature 3: Parser do markdown

Slug: `parser-markdown`. Deriva de [../constitution/provario.md](../constitution/provario.md)
(feature `parser-markdown`, "Contrato de formato do markdown", "Tratamento de
erro de parsing") e complementa [wizard-criacao-prova.md](wizard-criacao-prova.md)
(Passo 4). As decisões abaixo vieram da rodada de perguntas; nada foi inventado.

## 1. Decisões da entrevista técnica

| Tema                 | Decisão                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Linguagem / local    | TypeScript puro no frontend, sem lib de markdown. Módulo `resources/js/lib/parserProva.ts`                  |
| Contrato de retorno  | Função pura `parseProva(markdown, opcoes?)` → `{ questoes, avisos }`. Nunca lança; entrega o parcial        |
| Formatação inline    | Parser devolve **array de segmentos** `{ texto, negrito?, italico? }`; componente Vue renderiza tags        |
| Avisos               | Objetos `{ codigo, mensagem, questao? }` — código estável em SCREAMING_SNAKE + mensagem pt_BR               |
| Escopo do preview    | Render real das questões no Passo 4 (enunciado, alternativas a–e, afirmações V/F, gabarito). Estilo de tela |
| Fora (feature 4)     | Folha A4, `@media print`, `window.print()`, gabarito em página separada paginada                            |
| Testes               | Vitest **exclusivo do parser** (constituição). `buildPromptProva` / `useRascunhoProva` seguem sem teste     |
| Dependência de teste | Adiciona `vitest` como `devDependency`. Sem `@vue/test-utils` (não há teste de componente)                  |

## 2. Tipos — `resources/js/types/prova.ts` (acréscimos)

```ts
/** Trecho de texto com formatação inline resolvida pelo parser. */
export type SegmentoTexto = {
    texto: string;
    negrito?: boolean;
    italico?: boolean;
};

/** Enunciado / texto de alternativa / afirmação, já segmentado. */
export type TextoFormatado = SegmentoTexto[];

export type LetraAlternativa = 'a' | 'b' | 'c' | 'd' | 'e';

export type Alternativa = {
    letra: LetraAlternativa;
    texto: TextoFormatado;
};

export type QuestaoMultiplaEscolha = {
    numero: number;
    tipo: 'multipla-escolha';
    enunciado: TextoFormatado;
    alternativas: Alternativa[];
    /** Letra correta do gabarito, ou null se ausente/irreconhecível. */
    gabarito: LetraAlternativa | null;
};

export type AfirmacaoVF = {
    numero: number; // numeração local (1, 2, 3...) dentro da questão
    texto: TextoFormatado;
    gabarito: 'V' | 'F' | null;
};

export type QuestaoVerdadeiroFalso = {
    numero: number;
    tipo: 'verdadeiro-falso';
    enunciado: TextoFormatado;
    afirmacoes: AfirmacaoVF[];
};

export type Questao = QuestaoMultiplaEscolha | QuestaoVerdadeiroFalso;

export type AvisoParsing = {
    codigo: string;
    mensagem: string;
    questao?: number; // número da questão referida, quando aplicável
};

export type ProvaParseada = {
    questoes: Questao[];
    avisos: AvisoParsing[];
};

export type OpcoesParse = {
    /** Quantidade pedida no Passo 1; habilita o aviso QUANTIDADE_DIVERGENTE. */
    quantidadeEsperada?: number | null;
};
```

## 3. Parser — `resources/js/lib/parserProva.ts`

```ts
export function parseProva(
    markdown: string,
    opcoes?: OpcoesParse,
): ProvaParseada;
```

Função pura, sem dependência de framework. Determinística. Nunca lança —
qualquer desvio do contrato vira `AvisoParsing` e o parser segue com o que
conseguiu montar.

### 3.1 Estrutura de blocos

1. Normaliza quebras de linha (`\r\n` → `\n`) e remove espaços à direita das linhas.
2. Divide o texto em blocos por cabeçalhos de nível 2 (`^## `).
3. Cabeçalho de questão: `## Questão <N> (<tipo>)`, com `<N>` inteiro e
   `<tipo>` ∈ {`múltipla escolha`, `verdadeiro ou falso`} — comparação
   _case-insensitive_ e tolerante a acento ausente (`multipla escolha`).
4. Cabeçalho de gabarito: `## Gabarito` (case-insensitive). Só o **primeiro** vale.
5. Texto antes da primeira questão é ignorado (aviso `CONTEUDO_IGNORADO_ANTES`).
6. Cabeçalhos `##` não reconhecidos: aviso `SECAO_DESCONHECIDA`, bloco ignorado.

### 3.2 Questão de múltipla escolha

- Enunciado: linhas entre o cabeçalho e a primeira linha de alternativa,
  unidas por espaço; linhas em branco viram separador único.
- Alternativa: linha `^([a-e])\)\s+(.+)$`. Letras devem ser sequenciais a partir
  de `a`; letra fora de ordem ou repetida → aviso `ALTERNATIVA_FORA_DE_ORDEM`
  (a alternativa ainda é incluída, na ordem lida).
- `< 2` alternativas → aviso `ALTERNATIVAS_INSUFICIENTES`.
- Sem nenhuma alternativa → aviso `MULTIPLA_ESCOLHA_SEM_ALTERNATIVAS`; questão
  entra só com enunciado.

### 3.3 Questão de verdadeiro ou falso

- Enunciado: linhas entre o cabeçalho e a primeira afirmação.
- Afirmação: linha `^(\d+)\.\s*\(\s*\)\s+(.+)$`. `numero` = o inteiro lido.
- Sem afirmações → aviso `VF_SEM_AFIRMACOES`.
- `gabarito` de cada afirmação preenchido na fase 3.5.

### 3.4 Numeração das questões

- `numero` = o inteiro do cabeçalho (não a posição).
- Sequência esperada `1, 2, 3, …`. Divergência (buraco, repetição, fora de
  ordem) → aviso `NUMERACAO_INESPERADA` (parser mantém a ordem de leitura).

### 3.5 Gabarito

Cada linha não-vazia da seção: `^(\d+)\.\s*(.+)$` → `numero` + `resposta`.

- MC: `resposta` cujo primeiro caractere `[a-e]` (ignora texto após) →
  `questao.gabarito`. Caso contrário `GABARITO_NAO_RECONHECIDO` (gabarito fica `null`).
- V/F: `resposta` no formato `1-V, 2-F, …` (aceita `1: V`, `1 V`, espaços
  livres, `v`/`f` minúsculos). Cada par preenche a `AfirmacaoVF` de mesmo
  `numero`. Par sem afirmação correspondente, ou afirmação sem par →
  `GABARITO_VF_DIVERGENTE`. Formato ilegível → `GABARITO_NAO_RECONHECIDO`.
- Linha de gabarito para questão inexistente → `GABARITO_SOBRANDO`.
- Questão sem linha de gabarito → `GABARITO_INCOMPLETO`.
- Seção `## Gabarito` ausente → um único `GABARITO_AUSENTE` (não repete por questão).

### 3.6 Quantidade

Se `opcoes.quantidadeEsperada` é um número ≥ 1 e difere de `questoes.length` →
aviso `QUANTIDADE_DIVERGENTE` (mensagem cita esperado e encontrado).

### 3.7 Formatação inline (`resources/js/lib/textoFormatado.ts` ou interno)

`segmentar(texto: string): TextoFormatado`.

- `***x***` → `{ texto: 'x', negrito: true, italico: true }`.
- `**x**` → `negrito: true`. `*x*` → `italico: true`.
- Delimitador sem par de fechamento na linha → tratado como literal.
- `_x_`, `` `x` ``, `#`, `-`, `>`, `[..](..)`, `![..](..)`, `|` e qualquer
  outro marcador: **não interpretados**, entram como texto puro.
- Sempre retorna ao menos um segmento (`[{ texto: '' }]` para entrada vazia).

### 3.8 Catálogo de códigos de aviso

| Código                              | Quando                                           |
| ----------------------------------- | ------------------------------------------------ |
| `SEM_QUESTOES`                      | nenhum cabeçalho de questão reconhecido          |
| `CONTEUDO_IGNORADO_ANTES`           | texto antes da primeira questão                  |
| `SECAO_DESCONHECIDA`                | cabeçalho `##` que não é questão nem gabarito    |
| `CABECALHO_QUESTAO_MALFORMADO`      | `## Questão …` sem número ou sem `(tipo)` válido |
| `TIPO_QUESTAO_DESCONHECIDO`         | `(tipo)` fora dos dois suportados                |
| `NUMERACAO_INESPERADA`              | números fora da sequência `1..N`                 |
| `MULTIPLA_ESCOLHA_SEM_ALTERNATIVAS` | MC sem linhas `a)`–`e)`                          |
| `ALTERNATIVAS_INSUFICIENTES`        | MC com menos de 2 alternativas                   |
| `ALTERNATIVA_FORA_DE_ORDEM`         | letra repetida ou fora da sequência              |
| `VF_SEM_AFIRMACOES`                 | V/F sem linhas `N. ( ) …`                        |
| `GABARITO_AUSENTE`                  | sem seção `## Gabarito`                          |
| `GABARITO_INCOMPLETO`               | questão sem linha de gabarito                    |
| `GABARITO_NAO_RECONHECIDO`          | linha de gabarito presente, formato ilegível     |
| `GABARITO_VF_DIVERGENTE`            | pares V/F não batem com as afirmações            |
| `GABARITO_SOBRANDO`                 | linha de gabarito para questão inexistente       |
| `QUANTIDADE_DIVERGENTE`             | nº de questões ≠ `quantidadeEsperada`            |

> **Aprovação pendente:** confirmar o catálogo de códigos e as mensagens pt_BR
> (as mensagens exatas entram no plano).

## 4. Integração ao Passo 4 do wizard

### `resources/js/components/prova/PassoPreview.vue` (reescrito)

- Nova prop opcional `quantidade: number | null`.
- Chama `parseProva(props.markdown, { quantidadeEsperada: props.quantidade })`
  em um `computed`.
- Mantém o bloco de cabeçalho atual (instituição, escola, …, linhas do aluno).
- Substitui o `<pre>` por:
    - Lista de avisos: `Message` (severity `warn`) com um item por
      `AvisoParsing` — some quando `avisos` está vazio.
    - `<QuestaoPreview>` por questão, dentro do container que reflete `layout`
      (1 ou 2 colunas via CSS `columns`).
    - Bloco "Gabarito" ao final (na tela, sem quebra de página — isso é feature 4).
    - Fallback "Nenhum markdown colado ainda." quando `markdown` vazio.
- Mantém o `Message` info: "A folha A4 e a impressão chegam na próxima etapa."

### Componentes novos em `resources/js/components/prova/`

- `TextoFormatado.vue` — prop `segmentos: TextoFormatado`; renderiza `<span>` /
  `<strong>` / `<em>` (sem `v-html`).
- `QuestaoPreview.vue` — prop `questao: Questao`; renderiza título
  "Questão N", enunciado (`TextoFormatado`), e:
    - MC: lista `a) … e)` com a letra.
    - V/F: lista `N. ( ) afirmação`.
- `GabaritoPreview.vue` — prop `questoes: Questao[]`; uma linha por questão
  (`1. c` / `2. 1-V, 2-F`).

### `resources/js/pages/prova/Criar.vue`

- Passa `:quantidade="rascunho.config.quantidade"` ao `<PassoPreview>`.

Sem mudança de rota, controller, model ou `localStorage`.

## 5. Configuração do Vitest

- `npm i -D vitest`.
- `vitest.config.ts` na raiz: `test.environment = 'node'`,
  `test.include = ['resources/js/**/*.test.ts']`. Reaproveita o alias `@` →
  `resources/js` (via `vite-tsconfig-paths` **não** — resolver manual no config
  para não adicionar outra dep; decisão final no plano).
- Scripts em `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`.
- `composer.json` script `ci:check`: acrescentar `npm run test`.
- Atualizar `CLAUDE.md` (seção Comandos) com `npm run test`.

## 6. Testes (TDD — RED/GREEN/REFACTOR)

Arquivo `resources/js/lib/parserProva.test.ts` (co-locado). Casos mínimos:

### Caminho feliz

- Exemplo completo da constituição → 2 questões, tipos corretos, alternativas,
  afirmações, gabaritos (`c`; `1-V, 2-F`), `avisos` vazio.
- `quantidadeEsperada: 2` no exemplo → sem `QUANTIDADE_DIVERGENTE`.

### Formatação inline (`segmentar`)

- `**negrito**`, `*itálico*`, `***ambos***`, texto misto.
- `**` sem fechamento → literal.
- `# título`, `- lista`, `` `código` ``, `[x](y)`, `| a | b |` → texto puro.

### Avisos / parcial

- Markdown vazio → `SEM_QUESTOES`, `questoes: []`.
- Menos questões que o pedido → `QUANTIDADE_DIVERGENTE` + questões entregues.
- `## Questão 1 (charada)` → `TIPO_QUESTAO_DESCONHECIDO`.
- MC sem alternativas → `MULTIPLA_ESCOLHA_SEM_ALTERNATIVAS`, questão com enunciado.
- MC com 1 alternativa → `ALTERNATIVAS_INSUFICIENTES`.
- Alternativas `a) c) b)` → `ALTERNATIVA_FORA_DE_ORDEM`, todas incluídas.
- V/F sem afirmações → `VF_SEM_AFIRMACOES`.
- Sem `## Gabarito` → um `GABARITO_AUSENTE`.
- Gabarito faltando uma questão → `GABARITO_INCOMPLETO` na questão certa.
- Gabarito MC `1. xyz` → `GABARITO_NAO_RECONHECIDO`, `gabarito: null`.
- Gabarito V/F `2. 1-V` para questão de 2 afirmações → `GABARITO_VF_DIVERGENTE`.
- Gabarito `3. a` sem questão 3 → `GABARITO_SOBRANDO`.
- Numeração `1, 3` → `NUMERACAO_INESPERADA`.
- Texto solto antes da questão 1 → `CONTEUDO_IGNORADO_ANTES`.
- `## Anexo` no meio → `SECAO_DESCONHECIDA`.
- `\r\n` e espaços à direita → parse idêntico ao `\n` limpo.

Sem teste de componente Vue (constituição limita o Vitest ao parser).

## 7. Comandos de verificação

```bash
npm run test         # vitest run — suíte do parser verde
npm run types:check  # vue-tsc
npm run build        # páginas/componentes Vue compilam
composer test        # inalterado (PHP); nenhuma mudança de backend
```

## 8. Fora do escopo desta feature

- Folha A4, CSS `@media print`, `window.print()`, gabarito em página paginada
  separada (feature 4 — `template-impressao`).
- Persistência da prova; histórico; duplicação.
- Suporte a markdown além de `**negrito**` / `*itálico*` (tabelas, listas,
  imagens, código, links) — permanecem texto puro.
- Tipos de questão além de múltipla escolha e verdadeiro ou falso.
- Testes Vitest de qualquer coisa que não seja o parser.
- Alteração do template do prompt (Passo 2) ou do composable de rascunho.

```

```
