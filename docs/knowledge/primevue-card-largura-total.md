# `Card` do PrimeVue não ocupa a largura do contêiner

- **Data:** 2026-08-31
- **Tags:** primevue, vue, tailwind, layout, card

## Contexto

PrimeVue 4 (styled mode, tema Aura) + Tailwind v4. Páginas de formulário e visualização (`*/Show.vue`) usam `<Card>` dentro de um
contêiner (`<main class="mx-auto w-full max-w-6xl ...">` do `AppLayout`, ou um
wrapper com `max-w-*`).

## Sintoma

O `Card` encolhia para o tamanho do conteúdo em vez de esticar até as bordas do
contêiner. Na ficha de visualização o problema somava com um `max-w-2xl` no wrapper,
deixando o card estreito no meio de uma área larga.

## Causa raiz

Duas coisas:

1. O root do `Card` do PrimeVue não é `width: 100%` por padrão em todos os
   contextos de layout — quando o pai é `flex`/`grid` ou tem largura implícita,
   o card assume `fit-content`.
2. Wrapper com `max-w-2xl` (herança de telas antigas) limitava a largura antes
   mesmo do card.

## Solução

- `class="w-full"` explícito em **todo** `<Card>` de página:

    ```vue
    <Card class="w-full"> ... </Card>
    ```

- Remover `max-w-*` de wrappers de página que devem ocupar a largura toda; o
  limite de largura da área de conteúdo já vem do `AppLayout`
  (`max-w-6xl`). Em `*/Show.vue`: `max-w-2xl` → sem limite, e `w-full`
  nos dois cards (dados + baixa).

## Como evitar ou detectar antes

- `<Card>` novo: já nascer com `class="w-full"`.
- Ao criar página, não colocar `max-w-*` no wrapper a menos que o design peça
  coluna estreita — a largura máxima é responsabilidade do layout.

## Referências

- `resources/js/pages/*/Show.vue`
- `resources/js/pages/*/Create.vue`, `resources/js/pages/*/Edit.vue`
- `resources/js/layouts/AppLayout.vue`
