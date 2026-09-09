# Design — Provario

**Status:** gerado
**Gerado em:** 2026-09-09
**Origem:** análise de codebase

> Documento de referência para agentes de IA. Antes de construir ou revisar
> qualquer tela, leia este arquivo e reproduza os valores abaixo literalmente.
>
> Blueprint criado retroativamente. Os valores vêm da leitura de
> `resources/css/app.css`, `resources/js/app.ts` e dos componentes em
> `resources/js/components`/`layouts`. O projeto usa o **preset Aura** do PrimeVue
> sem redefinir a paleta semântica — cores marcadas como "herdadas do Aura" não
> estão fixadas em código do projeto.

## 1. Princípios visuais

- **Simples** — a UI da aplicação some para dar lugar ao conteúdo; PrimeVue Aura
  stock, sem branding. Nenhuma tela introduz identidade visual institucional
  (decisão de escopo da constituição).
- **Funcional/utilitário** — telas administrativas diretas: `PageHeader` +
  conteúdo. Densidade padrão do PrimeVue, sem customização de espaçamento de
  componente.
- **Fiel à impressão** — a folha da prova (`.folha-impressao`) é sempre
  monocromática (fundo `#fff`, texto `#000`), independente do tema da aplicação,
  porque o alvo é papel A4.

Regras que nenhuma tela deve violar:

- Dark mode via classe `.dark` no `<html>`; todo utilitário de cor precisa do par
  `dark:`.
- A folha de impressão nunca herda cores do tema — sempre preto sobre branco.
- Domínio e rótulos em português.

## 2. Fundamentos / design tokens

### 2.1 Paleta de cores

Tokens usados nas classes Tailwind do projeto (via `tailwindcss-primeui`, que
expõe as cores semânticas do preset Aura como utilitários `*-surface-*`,
`*-primary*`):

| Token                    | Valor                                  | Papel semântico             | Onde usar                                              |
| ------------------------ | -------------------------------------- | --------------------------- | ----------------------------------------------------- |
| `surface-0`              | herdado do Aura (branco no light)      | superfície elevada          | sidebar, topbar, cards (`bg-surface-0`)               |
| `surface-50`             | herdado do Aura                        | fundo da app (light)        | `AppLayout` (`bg-surface-50`)                          |
| `surface-100` / `200`    | herdado do Aura                        | hover / bordas suaves       | hover de item de menu, borda de tabela                 |
| `surface-200` (light)    | herdado do Aura                        | fundo de botão `secondary`  | override em `app.ts` (era `surface.100`, subiu 1 degrau) |
| `surface-500`            | herdado do Aura                        | texto secundário            | subtítulos, `empty state` (`text-surface-500`)         |
| `surface-600` / `300`    | herdado do Aura                        | texto de item de menu       | `AppSidebar` item inativo                              |
| `surface-800`            | herdado do Aura                        | borda / hover (dark)        | bordas no dark                                         |
| `surface-900`            | herdado do Aura                        | texto principal / superfície dark | `text-surface-900`, `dark:bg-surface-900`        |
| `surface-950`            | herdado do Aura                        | fundo da app (dark)         | `dark:bg-surface-950`                                  |
| `primary`                | herdado do Aura (preset stock)         | cor de marca / ação         | item de menu ativo (`text-primary`, `bg-primary/10`)  |
| `--p-primary-color`      | herdado do Aura                        | barra de progresso Inertia  | `progress.color` em `app.ts`                           |
| Folha: fundo             | `#fff`                                 | papel                       | `.folha-impressao` (fixo, não-token)                   |
| Folha: texto             | `#000`                                 | tinta                       | `.folha-impressao` (fixo, não-token)                   |
| Folha: sombra            | `rgba(0, 0, 0, 0.15)`                  | elevação da folha na tela   | `.folha-impressao box-shadow`                          |

Estados semânticos (`success`, `info`, `warn`, `danger`) vêm dos componentes
PrimeVue (`Message`, `Toast`, `Button severity=...`); não há tokens de estado
próprios do projeto.

> Valores hex exatos de cada passo da escala `surface`/`primary`: **A definir** —
> não estão fixados em código; são os defaults do preset Aura (`@primevue/themes`
> v4.5.4). Se precisar dos hex, extraia do preset em runtime ou consulte a doc do
> Aura.

### 2.2 Tipografia

- **Família (texto e título):** `Geist Sans` via `@fontsource/geist-sans`.
  Stack de fallback (de `--font-sans` em `app.css`):
  `'Geist Sans', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`.
- Sem família serifada; sem família mono declarada pelo projeto.

Escala em uso (classes Tailwind observadas):

| Uso                        | Classe            | Tamanho / peso aprox.        |
| -------------------------- | ----------------- | ---------------------------- |
| Título de página (`h1`)    | `text-2xl font-semibold` | 1.5rem / 600          |
| Subtítulo de página        | `text-sm` (`text-surface-500`) | 0.875rem / 400  |
| Item de menu               | `text-sm`         | 0.875rem / 400 (ativo: `font-medium`) |
| Corpo padrão               | herdado (`14px` base do reset) | 0.875–1rem / 400 |
| Enunciado/alternativas da prova | `text-sm`    | 0.875rem / 400 (número da questão: `font-semibold`) |

`line-height`: padrão do Tailwind por tamanho; não há override do projeto.

### 2.3 Espaçamento e escala

- **Unidade base:** escala padrão do Tailwind 4 (base `0.25rem` = `4px`).
- Espaçamentos observados: `gap-1` (4px), `gap-2` (8px), `gap-3` (12px),
  `gap-4` (16px); padding de conteúdo `p-4` (16px) → `sm:p-6` (24px);
  sidebar/topbar padding `p-4` / `px-4`.
- Largura do container principal: `max-w-6xl` (72rem / 1152px), centralizado
  (`mx-auto`).
- Largura da sidebar fixa: `w-64` (16rem); drawer mobile: `w-72` (18rem).
- Altura da topbar: `h-16` (4rem / 64px).
- Folha A4: largura `210mm`, altura mínima `297mm`, padding interno `15mm`
  (tela). Na impressão: `@page { size: A4; margin: 15mm }` e a folha vai a
  `padding: 0`.

### 2.4 Raios, bordas e sombras

- **Raio base:** `--radius: 0.5rem` (`:root` em `app.css`). Derivados:
  `--radius-lg = 0.5rem`, `--radius-md = 0.375rem` (`radius - 2px`),
  `--radius-sm = 0.25rem` (`radius - 4px`).
- Raios em uso: `rounded-md` (itens de menu, botões), `rounded` (thumbnails de
  logo).
- **Borda padrão:** `1px` (`border`, `border-r`, `border-b`) na cor
  `border-surface-200` / `dark:border-surface-800`.
- **Sombra/elevação:** o projeto não usa utilitários `shadow-*` no chrome da app.
  Única sombra explícita: a folha na tela — `box-shadow: 0 1px 8px rgba(0,0,0,0.15)`
  (removida em `@media print`). Elevação de menus/drawer/dialog vem do PrimeVue.

### 2.5 Breakpoints e grid

- **Mobile-first.** Breakpoints padrão do Tailwind: `sm` 640px, `md` 768px,
  `lg` 1024px, `xl` 1280px, `2xl` 1536px.
- Ponto de virada do layout: **`lg` (1024px)** — abaixo, sidebar vira `Drawer` e
  a topbar mostra o botão de menu; acima, sidebar fixa `w-64`.
- Largura máxima de conteúdo: `max-w-6xl` (1152px).
- Sem sistema de grid próprio; layout via flex/`flex-col`/`gap-*`. Prova em 1 ou
  2 colunas conforme escolha do passo 3 (layout controlado no
  `template-impressao`).

## 3. Layout e arquitetura de tela

- **Shell (`AppLayout.vue`):** sidebar fixa à esquerda (`>= lg`, `w-64`, borda
  direita, `sticky top-0 h-screen`) + coluna de conteúdo com `AppTopbar`
  (`sticky top-0 z-20 h-16`) e `<main class="mx-auto w-full max-w-6xl p-4 sm:p-6">`.
  Abaixo de `lg`: sidebar em `Drawer` (`w-72`, header oculto), aberto pelo botão
  de menu na topbar.
- **`AuthLayout.vue`:** shell separado para `pages/auth/*` (login, registro),
  sem sidebar/topbar.
- **Navegação (`AppSidebar.vue`):** logo no topo + lista vertical de `Link`
  Inertia. Item ativo: `bg-primary/10 text-primary font-medium`; inativo:
  `text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800`.
  Ícone `size-4` do `@lucide/vue`. Itens atuais: Dashboard (`LayoutGrid`),
  Perfis institucionais (`Building2`), Criar prova (`FileText`), Perfil
  (`UserRound`). Cada feature acrescenta seus próprios itens aqui.
- **Topbar (`AppTopbar.vue`):** botão de menu (só `<lg`), logo (só `<lg`), e à
  direita `ThemeToggle` + `UserMenu`.
- **Cabeçalho de página (`PageHeader.vue`):** `Breadcrumbs` opcional +
  `<h1 class="text-2xl font-semibold">` + subtítulo opcional
  (`text-sm text-surface-500`) + slot `#actions` à direita (tipicamente um
  `Button` "Novo ...").
- **Página típica:** `<Head title="...">` + `<div class="space-y-4">` contendo
  `PageHeader` e o conteúdo (tabela, formulário ou wizard).
- **Densidade:** padrão do PrimeVue; sem `size="small"` global.

Padrões de tela:

- **Listagem:** `PageHeader` (com ação "Novo ...") + `DataTable` do PrimeVue.
  Coluna "Ações" à direita com `Button` `icon`-only, `variant="text"`
  (`pi pi-pencil` `severity="secondary"`, `pi pi-trash` `severity="danger"`).
  Empty state: `<div class="flex flex-col items-center gap-2 py-10 text-surface-500">`
  com ícone `pi` `text-2xl` + frase.
- **Detalhe:** não há tela de detalhe dedicada no MVP (a prova não é persistida).
- **Formulário:** componente de formulário próprio por recurso (ex.:
  `PerfilForm.vue`), reutilizado por `Create.vue` e `Edit.vue`. Upload de imagem
  via `LogoDropzone.vue`.
- **Wizard (`pages/prova/Criar.vue` + `components/prova/Passo*.vue`):** 4 passos
  sequenciais (`PassoConfiguracao`, `PassoPrompt`, `PassoConteudo`,
  `PassoPreview`); estado em `localStorage` via `useRascunhoProva`.

## 4. Componentes-base

**Biblioteca:** PrimeVue **4.5.4** (`primevue` + `@primevue/themes`), preset
**Aura** com override local (`AppPreset` em `app.ts`), `cssLayer` nomeado
`primevue`, `darkModeSelector: '.dark'`, locale `pt_BR` (`@/lib/primevue-ptbr`).
Complemento: `tailwindcss-primeui` (utilitários de cor casados com o tema).

Componentes PrimeVue em uso: `Button`, `DataTable`/`Column`, `Drawer`, `Menu`,
`Message`, `ConfirmDialog` (+ `ConfirmationService`/`useConfirm`),
`Toast` (+ `ToastService`/`useToast`), form inputs (select/number/textarea nos
passos do wizard), `DatePicker` (perfis/datas).

Override de tema registrado (`app.ts`): `Button` `severity="secondary"` no tema
light usa `background {surface.200}` / hover `{surface.300}` / active
`{surface.400}` (o stock `{surface.100}` tinha contraste fraco sobre
`{surface.0}`). Ver `docs/knowledge/botao-secondary-tema-light.md`.

Convenções de `Button`:

- Ação primária: `<Button label="..." icon="pi pi-plus">` (dentro de `#actions`
  do `PageHeader`); como link: `:as="Link" :href="route(...)"`.
- Ação em tabela: `icon`-only, `variant="text"`, `severity` conforme
  destrutividade.
- Ícone dentro de `Button` PrimeVue: usar `pi pi-*` (não Lucide) — ver
  `docs/knowledge/icones-botoes-modais-confirmacao.md`.

Componentes próprios: `AppLayout`, `AuthLayout`, `AppSidebar`, `AppTopbar`,
`AppLogo`, `Breadcrumbs`, `PageHeader`, `FlashToasts`, `ThemeToggle`, `UserMenu`,
`LogoDropzone`, `PerfilForm`, e a família `prova/` (`Passo*`, `QuestaoPreview`,
`GabaritoPreview`, `TextoFormatado`).

Markup canônico da folha de prova:

```html
<div class="folha-impressao">
  <!-- cabeçalho: instituição, escola, disciplina, professor, título,
       bimestre/período, valor total, logo + linhas em branco (nome, turma, data, nota) -->
  <div class="folha-questao flex break-inside-avoid flex-col gap-2">
    <p class="font-semibold">Questão N</p>
    <p class="text-sm"><!-- enunciado via <TextoFormatado> --></p>
    <ol class="flex break-inside-avoid flex-col gap-1 text-sm"> a) ... e) ... </ol>
  </div>
  <div class="folha-gabarito"><!-- sempre última página, break-before: page --></div>
</div>
```

## 5. Padrões de interação e estados

- **Estados obrigatórios de tela com dados:**
  - Vazio — bloco centralizado `py-10 text-surface-500` com ícone `pi` + frase
    (padrão do `DataTable #empty`).
  - Carregando — navegação Inertia mostra a barra de progresso no topo
    (`progress.color: var(--p-primary-color)`); sem skeletons próprios.
  - Erro — `Message severity="error"`/`"warn"` inline, ou `Toast` de erro.
  - Sem permissão — não se aplica (sem papéis).
- **Hover/focus/active/disabled:** herdados do Aura para componentes PrimeVue.
  Itens de menu: `transition-colors` + hover `bg-surface-100`/`dark:bg-surface-800`.
- **Validação:** erros de formulário vêm do backend (form requests Laravel) via
  props Inertia, exibidos inline no `PerfilForm`. Sem validação client-side
  paralela.
- **Feedback de ação:** `Toast` do PrimeVue (`useToast`) para sucesso/erro de
  operações assíncronas (ex.: "Copiar prompt", "Avisos copiados"); `life` 3000ms
  (sucesso) / 4000ms (erro). Flash messages do Laravel renderizadas por
  `FlashToasts.vue`.
- **Confirmação destrutiva:** `ConfirmDialog` (`useConfirm`) com
  `header`/`message`, `icon: 'pi pi-exclamation-triangle'`,
  `acceptClass: 'p-button-danger'`, labels em português ("Excluir" / "Cancelar").
  `<ConfirmDialog :style="{ width: '36rem' }" />` no `AppLayout`.

## 6. Movimento e transições

- Apenas `transition-colors` nos itens de menu e transições internas dos
  componentes PrimeVue (Drawer slide, Menu fade — durações/easings do Aura).
- Sem animações de entrada de página, sem biblioteca de animação.
- **`prefers-reduced-motion`:** **A definir** — não há tratamento explícito no
  código do projeto.

## 7. Iconografia e imagens

- **Ícones da app (navegação, chrome):** `@lucide/vue`, tamanho `size-4` (16px)
  na sidebar / `size-5` (20px) na topbar e no `ThemeToggle`. Traço padrão do
  Lucide.
- **Ícones dentro de componentes PrimeVue:** PrimeIcons (`pi pi-*`) — obrigatório
  para `Button`/`ConfirmDialog` renderizarem o ícone corretamente
  (`docs/knowledge/icones-botoes-modais-confirmacao.md`,
  `docs/knowledge/primeicons-nao-carregam.md`). Tamanhos observados: `text-xl`,
  `text-2xl` em empty states.
- **Logo institucional:** imagem única por perfil, exibida `size-10`
  (`h-10 w-10`), `rounded`, `object-contain`. Sem logo: placeholder
  `<span class="pi pi-image text-surface-400 text-xl">`.
- **Logo da aplicação:** `AppLogo.vue`.
- Sem avatares de usuário; sem thumbnails além do logo.

## 8. Acessibilidade

- **Nível alvo:** **A definir** formalmente. A constituição não fixa um nível;
  recomenda-se **WCAG AA** como meta.
- Práticas presentes no código: `aria-label` em botões `icon`-only
  ("Abrir menu", "Alternar tema", "Abrir/Fechar menu"), `aria-haspopup` em
  gatilhos de menu, `alt` em imagens de logo, uso de `<h1>`, `<nav>`, `<ol>`/`<ul>`
  semânticos na folha.
- Foco visível: padrão do navegador + estados de foco do Aura; sem override.
- Tamanho mínimo de alvo de toque: **A definir** — usa os tamanhos padrão do
  PrimeVue.

## 9. Tema claro/escuro

- **Mecanismo:** classe `.dark` no `<html>` (`document.documentElement`),
  alternada por `useAppearance` / `updateTheme`. `@custom-variant dark (&:is(.dark *))`
  em `app.css`; PrimeVue configurado com `darkModeSelector: '.dark'`.
- **Opções:** `light`, `dark`, `system` (segue `prefers-color-scheme`, com
  listener para mudança em tempo real). Seletor no `ThemeToggle` (ícones `Sun` /
  `Moon` / `Monitor`, rótulos "Claro" / "Escuro" / "Sistema").
- **Persistência:** `localStorage['appearance']` (cliente) **e** cookie
  `appearance` (`path=/`, `max-age` 365d, `SameSite=Lax`) para SSR. `initializeTheme()`
  roda no bootstrap (`app.ts`).
- **Mapeamento de tokens (seção 2.1) entre temas:**
  - Fundo da app: `bg-surface-50` → `dark:bg-surface-950`.
  - Superfície (sidebar/topbar): `bg-surface-0` → `dark:bg-surface-900`.
  - Texto principal: `text-surface-900` → `dark:text-surface-0`.
  - Bordas: `border-surface-200` → `dark:border-surface-800`.
  - Cada utilitário de cor no projeto declara explicitamente seu par `dark:`.
- **Exceção:** `.folha-impressao` é **tema único** — sempre `#fff`/`#000`,
  independente da classe `.dark`, porque o destino é papel.

## 10. Referências e exemplos

- Tokens e tema: `resources/css/app.css` (`--radius`, `--font-sans`, ordem de
  `@layer`, CSS de impressão), `resources/js/app.ts` (`AppPreset` sobre Aura,
  `cssLayer.order`, `progress.color`, locale).
- Preset base: `@primevue/themes/aura` (v4.5.4) — fonte dos hex de
  `surface`/`primary` não fixados no projeto.
- Shell: `resources/js/layouts/AppLayout.vue`, `resources/js/components/AppSidebar.vue`,
  `resources/js/components/AppTopbar.vue`.
- Padrões de tela: `resources/js/pages/perfis/Index.vue` (listagem + empty +
  confirm), `resources/js/components/PageHeader.vue`, `resources/js/pages/prova/Criar.vue`
  (wizard).
- Folha de impressão: `.folha-impressao` / `.folha-questao` / `.folha-gabarito`
  em `app.css`; `resources/js/components/prova/QuestaoPreview.vue`,
  `GabaritoPreview.vue`, `TextoFormatado.vue`.
- Base de conhecimento de UI: `docs/knowledge/INDEX.md`
  (`botao-secondary-tema-light`, `primeicons-nao-carregam`,
  `icones-botoes-modais-confirmacao`, `primevue-card-largura-total`,
  `datatable-empty-message-centralizada`, `data-hora-formato-fuso`).
