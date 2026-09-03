# Plano técnico — Feature 4: Template de impressão

Deriva de [../specs/template-impressao.md](../specs/template-impressao.md)
(aprovada). Não introduz requisito novo — só o "como". Numeração de critérios
(CA1..CA10) refere-se à seção 6 da spec.

## 1. Abordagem geral

Uma única árvore de componentes serve tela e papel. O Passo 4:

```
PassoPreview.vue
├─ Message (info)                     ← fora da folha, não impresso
├─ Message (warn, avisos de parsing)  ← fora da folha, não impresso
├─ Button "Imprimir"                  ← fora da folha, não impresso
└─ div.folha-wrap  (overflow-x:auto)
   └─ div.folha-impressao   ← A4 na tela; única coisa impressa
      ├─ header (cabeçalho institucional + título)
      ├─ dl (linhas do aluno)
      ├─ div.folha-questoes  (column-count:2 quando layout===2)
      │  └─ QuestaoPreview* (break-inside:avoid)
      └─ section.folha-gabarito  (break-before:page)
         └─ GabaritoPreview
```

O CSS de impressão vive em `resources/css/app.css` (bloco `@media print` +
`@page`). Técnica de isolamento por **visibility**: esconde tudo, reexibe só
`.folha-impressao`. Não exige marcar cada elemento de chrome — cobre sidebar,
topbar, `PageHeader`, stepper, `Message`s, botões, `Drawer`, `ConfirmDialog`,
toasts (todos teleportados para `body`) de uma vez.

## 2. Arquivos

### 2.1 `resources/css/app.css` — acrescenta ao final

```css
@layer components {
    .folha-impressao {
        width: 210mm;
        min-height: 297mm;
        padding: 15mm;
        margin: 0 auto;
        background: #fff;
        color: #000;
        box-shadow: 0 1px 8px rgba(0, 0, 0, 0.15);
    }
}

@media print {
    @page {
        size: A4;
        margin: 15mm;
    }

    /* isolamento: só a folha é impressa */
    body * {
        visibility: hidden;
    }

    .folha-impressao,
    .folha-impressao * {
        visibility: visible;
    }

    .folha-impressao {
        position: absolute;
        inset: 0 auto auto 0;
        width: 100%;
        min-height: 0;
        margin: 0;
        padding: 0; /* margem vem do @page */
        box-shadow: none;
    }

    .folha-questao {
        break-inside: avoid;
    }

    .folha-gabarito {
        break-before: page;
    }
}
```

Notas:

- `.folha-impressao` fica fora de `@media print` também (bloco `components`)
  para a aparência de tela (CA1). O tema é claro/escuro no app, mas a folha é
  **sempre branca com texto preto**, na tela e no papel — fidelidade.
- `position: absolute; inset: 0 auto auto 0` tira a folha do fluxo do `main`
  centralizado (`mx-auto max-w-6xl p-4`) na impressão, evitando margem dupla.
- Não usar `visibility: hidden` + `position` na folha quebra empilhamento de
  páginas? Não: `visibility` preserva paginação do conteúdo visível; testado é
  o caminho clássico. Se na verificação manual o Chrome cortar conteúdo,
  fallback documentado em §5.

### 2.2 `resources/js/components/prova/PassoPreview.vue` — reescrito

Script:

```ts
import Button from 'primevue/button';
import Message from 'primevue/message';
import { computed } from 'vue';
import type { CabecalhoProva, LayoutColunas } from '@/types/prova';
import GabaritoPreview from '@/components/prova/GabaritoPreview.vue';
import QuestaoPreview from '@/components/prova/QuestaoPreview.vue';
import { parseProva } from '@/lib/parserProva';

const props = defineProps<{
    cabecalho: CabecalhoProva;
    markdown: string;
    layout: LayoutColunas;
    quantidade: number | null;
}>();

const temMarkdown = computed(() => props.markdown.trim().length > 0);
const prova = computed(() =>
    parseProva(props.markdown, { quantidadeEsperada: props.quantidade }),
);

function imprimir() {
    window.print();
}
```

Template — mudanças sobre o atual:

- Trocar `Message severity="info"` de texto: "A folha A4 e a impressão chegam
  na próxima etapa" → algo como "Confira a folha abaixo e clique em Imprimir.
  Use 'Salvar como PDF' na caixa de impressão para gerar um arquivo."
- Adicionar, acima da folha, uma linha com o `<Button label="Imprimir"
  icon="pi pi-print" @click="imprimir" />`. Sempre habilitado (CA6, CA8).
- Renomear o container visual: classe `folha-impressao` no `div` que hoje é
  `border … rounded border p-6`. Remover `border/rounded/p-6/dark:*` — o
  visual agora é a folha branca A4. Envolver em
  `<div class="folha-wrap overflow-x-auto">`.
- Header, `<h2>` do título e `<dl>` das linhas do aluno: **mantidos como
  estão** (campos vazios já são omitidos — CA2, CA3). Ajustar cores fixas
  (texto preto) via classes utilitárias neutras, já que a folha não segue o
  tema.
- Container das questões: adicionar classe `folha-questoes`; manter o
  `:style` condicional `column-count: 2; column-gap: 2rem` para
  `layout === 2`. Trocar `flex flex-col gap-6` (não funciona com colunas) por
  espaçamento por `margin-bottom` nos filhos (`space-y-6` no modo 1 coluna;
  no modo colunas, `QuestaoPreview` recebe `mb-6`).
- Bloco do gabarito: `<section class="folha-gabarito …">` (era `div` com
  `mt-6 border-t pt-4`). Manter separador visual na tela (`border-t`); o
  `break-before: page` só age no papel (CA7d).
- Fallback "Nenhum markdown colado ainda." permanece, dentro da folha (CA8).

### 2.3 `resources/js/components/prova/QuestaoPreview.vue`

- Já tem `break-inside-avoid` (utilitário Tailwind) no wrapper. **Adicionar
  também a classe `folha-questao`** para o seletor de `@media print` (garante
  o comportamento mesmo se a utilitária for purgada num contexto de print).
  Alternativa: confiar só no utilitário `break-inside-avoid` e dropar o
  seletor `.folha-questao` do CSS. **Decisão:** manter as duas (classe
  semântica + utilitário) — custo zero, robustez maior. (CA7c)
- Bloco de alternativas/afirmações: adicionar `break-inside-avoid` no `<ol>` /
  `<ul>` para o miolo não rachar.

### 2.4 `resources/js/components/prova/GabaritoPreview.vue`

- Sem mudança de lógica. O `break-before: page` fica no `<section
  class="folha-gabarito">` dentro de `PassoPreview`, não aqui.

### 2.5 `resources/js/pages/prova/Criar.vue`

- Sem mudança obrigatória. O botão "Imprimir" nasce dentro de `PassoPreview`.
- A navegação inferior (Voltar / Nova prova) some no print pela regra de
  isolamento — nenhum ajuste em `Criar.vue`.
- Opcional (não fazer agora): mover o botão "Imprimir" para a barra de ações.
  Fora do escopo salvo pedido do usuário.

### 2.6 `resources/js/types/prova.ts`

- Sem mudança. Nenhum tipo novo.

## 3. O que NÃO muda

- `routes/`, `app/`, `database/`, `config/`, `resources/views/`.
- `useRascunhoProva`, `localStorage`, `buildPromptProva`, `parserProva.ts`.
- `parserProva.test.ts` e a config do Vitest — intocados (CA10).
- `AppLayout.vue`, `AppSidebar.vue`, `PageHeader.vue` — o print os esconde via
  CSS global, sem editar os componentes.
- Nenhum item de menu.

## 4. Decisões de design

| Decisão | Escolha | Porquê |
| --- | --- | --- |
| Isolamento de print | `visibility: hidden` em `body *` + reexibe `.folha-impressao` | Não precisa marcar cada peça de chrome; pega componentes teleportados; padrão consolidado |
| Onde fica o CSS | `resources/css/app.css`, blocos `@layer components` + `@media print` | Uma folha de estilo só; sem arquivo/import novo; Vite já processa |
| Folha sempre branca | cores fixas (`#fff`/`#000`), ignora tema dark | Papel é branco; evita "dark mode impresso"; fidelidade tela↔papel |
| Folha na tela | `width: 210mm; min-height: 297mm` + `overflow-x:auto` no wrap | WYSIWYG (CA1) sem `transform: scale` (quebra clique/scroll) |
| Quebra de questão | classe `.folha-questao` + utilitário `break-inside-avoid` | Redundância barata; garante CA7c mesmo com purge de utilitárias |
| Botão "Imprimir" | dentro de `PassoPreview`, chama `window.print()` | Menos edição em `Criar.vue`; coeso com o preview |
| Gabarito paginado | `<section class="folha-gabarito">` com `break-before: page` | Constituição: gabarito sempre última página separada (CA7d) |

## 5. Riscos

| Risco | Mitigação |
| --- | --- |
| `visibility:hidden` + `position:absolute` na folha corta conteúdo multipágina em alguns navegadores | Fallback: trocar por regras explícitas escondendo `aside`, `.app-topbar`, `.p-…` overlays, stepper e botões (`display:none`), sem mexer no fluxo da folha. Verificar no Chrome (alvo primário) na tarefa de QA |
| `column-count: 2` + `break-inside: avoid` deixa colunas muito desiguais | Aceitável no MVP; não há requisito de balanceamento. Documentado como fora de escopo na spec |
| `210mm` estoura a largura do `Card`/`main` em telas pequenas | `overflow-x:auto` no `.folha-wrap`; a folha rola horizontalmente, não encolhe (spec §4.1) |
| Logo grande distorce cabeçalho no papel | `object-contain` + caixa fixa (`h-16 w-16`) já aplicados; mantidos |
| Tema dark do app "vaza" para a folha na tela | Cores fixas na `.folha-impressao` e filhos; classes utilitárias `dark:` removidas do markup da folha |
| Utilitárias Tailwind purgadas dentro de `@media print` | Seletores semânticos (`.folha-*`) no CSS escrito à mão não dependem do purge |

## 6. Verificação (tarefa de QA manual — sem teste automatizado de componente)

```bash
npm run types:check   # vue-tsc
npm run build         # componentes compilam
npm run test          # parser — verde e inalterado (CA10)
composer test         # PHP — inalterado
```

QA manual no Chrome, Passo 4 com markdown do exemplo da constituição:

1. Folha A4 branca, centralizada, com sombra, na tela (CA1).
2. Cabeçalho com campos do Passo 3 + logo; campos vazios omitidos (CA2).
3. Linhas do aluno visíveis (CA3).
4. Questões renderizadas, `**negrito**`/`*itálico*` aplicados, 1 e 2 colunas
   conforme Passo 3 (CA4).
5. Gabarito ao final, uma linha por questão (CA5).
6. Botão "Imprimir" abre a caixa de impressão (CA6).
7. Ctrl+P / pré-visualização: só a folha; A4; nenhuma questão partida; gabarito
   em página nova sozinho (CA7 a–d).
8. Markdown vazio: folha com cabeçalho + linhas do aluno + "Nenhum markdown
   colado ainda."; botão ainda funciona (CA8).
9. Avisos de parsing listados fora da folha, ausentes na impressão (CA9).

## 7. Decomposição prevista (entra em `docs/tasks/template-impressao.md`)

1. CSS: `.folha-impressao` (tela) + `@media print` + `@page` em `app.css`.
2. `PassoPreview.vue`: classe `folha-impressao`, wrap `overflow-x-auto`,
   cores fixas da folha, `section.folha-gabarito`, ajuste de espaçamento das
   questões.
3. `PassoPreview.vue`: botão "Imprimir" + `imprimir()`; texto do `Message`
   info.
4. `QuestaoPreview.vue`: classe `folha-questao` + `break-inside-avoid` no
   miolo.
5. QA manual (§6) + `types:check` / `build` / `test` / `composer test`.

Sem ciclo TDD de Vitest nesta feature (constituição restringe o Vitest ao
parser); a verificação é a checklist manual §6 mais a suíte existente verde.
