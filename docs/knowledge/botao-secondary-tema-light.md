# Botão `severity="secondary"` apagado no tema light

- **Data:** 2026-09-03
- **Tags:** primevue, vue, tailwind, tema, button
- **Status:** resolvido

## Contexto

PrimeVue 4.5 (styled mode) com o preset `Aura` stock (`resources/js/app.ts`,
config do `PrimeVue`), Tailwind v4 + `tailwindcss-primeui`. Tema light. Botões
de contexto secundário (`<Button severity="secondary">`) — ex.
`resources/js/components/AppTopbar.vue`, `resources/js/components/UserMenu.vue`.

## Sintoma

No tema claro, o botão secondary fica quase sem cor de fundo: o cinza é tão
próximo do branco que o botão parece um `text`/`plain`, sem hierarquia visual
contra o `bg-surface-0` da página. No tema dark o contraste é adequado.

## Causa raiz

O token stock do Aura `button.colorScheme.light.root.secondary.background`
resolve para `{surface.100}`, que sobre `surface.0` tem contraste muito baixo.

## Solução

Correção global via `definePreset` em `resources/js/app.ts` — sobe um degrau na
escala `surface` para todos os botões `severity="secondary"` no tema light (o
tema dark herda o Aura stock, que já tem contraste adequado):

```ts
const AppPreset = definePreset(Aura, {
    components: {
        button: {
            colorScheme: {
                light: {
                    root: {
                        secondary: {
                            background: '{surface.200}',
                            hoverBackground: '{surface.300}',
                            activeBackground: '{surface.400}',
                            borderColor: '{surface.200}',
                            hoverBorderColor: '{surface.300}',
                            activeBorderColor: '{surface.400}',
                        },
                    },
                },
            },
        },
    },
});
```

E `theme: { preset: AppPreset, ... }` no lugar de `preset: Aura`.

Não aplicar classe `bg-*` pontual nos botões — o preset já resolve para todos.

## Como evitar ou detectar antes

- Ao revisar tela nova no tema light, conferir se botões secundários têm fundo
  distinguível do fundo da página.
- `grep -rn 'severity="secondary"' resources/js` para inventariar os botões.
- Novo ajuste de aparência de componente PrimeVue vai no `AppPreset`
  (`definePreset`), não em classe solta na página.

## Referências

- `resources/js/app.ts` (config do PrimeVue, `cssLayer.order`)
- `resources/css/app.css` (`@layer` order, `@plugin 'tailwindcss-primeui'`)
- `resources/js/components/AppTopbar.vue`
- `resources/js/components/UserMenu.vue`
- https://primevue.org/theming/styled/
