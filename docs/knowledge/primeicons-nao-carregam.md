# Ícones `pi pi-*` (PrimeIcons) não aparecem

- **Data:** 2026-08-31
- **Tags:** primevue, primeicons, icones, vite
- **Status:** resolvido

## Contexto

Stack: PrimeVue 4.5 (tema Aura, styled mode) + Vue 3 / Inertia / Vite 8. O template
usa `@lucide/vue` como biblioteca de ícones principal (sidebar, topbar, menu do
usuário), mas vários componentes PrimeVue recebem ícones via string de classe
`pi pi-*`: `Button icon="pi pi-plus"`, `InputIcon class="pi pi-search"`,
`confirm.require({ icon: 'pi pi-exclamation-triangle' })`, etc.

## Sintoma

Botões e campos renderizam, mas o ícone fica em branco / mostra um retângulo ou
nada no lugar do glifo. Sem erro no console. Afeta as telas de listagem
(ativos/categorias/locais/usuários), o `AtivoFiltros` e o diálogo de exclusão do
perfil.

## Causa raiz

O pacote `primeicons` não estava instalado nem importado. PrimeVue 4 **não** traz
mais a fonte de ícones embutida — `primeicons` é dependência separada e o CSS
(`primeicons/primeicons.css`, que define o `@font-face` e as classes `.pi-*`)
precisa ser importado manualmente. Sem ele, as classes `pi pi-*` não existem e o
glifo não é desenhado.

## Solução

```bash
npm install primeicons
```

E importar o CSS no bundle. Feito em `resources/css/app.css`, logo após o Tailwind:

```css
@import 'tailwindcss';
@import 'primeicons/primeicons.css';
```

Após `npm run build`, conferir que a fonte foi empacotada:
`ls public/build/assets/ | grep primeicons` deve listar `primeicons-*.woff2` etc.

## Como evitar ou detectar antes

- Qualquer `pi pi-*` novo depende desse import — se sumir do `app.css`, todos os
  ícones PrimeIcons quebram de uma vez.
- Alternativa (não adotada): trocar os `pi pi-*` por componentes `@lucide/vue`
  via slot `#icon` do `Button`, alinhando com a convenção do CLAUDE.md. Ficou como
  dívida caso se queira uma única biblioteca de ícones.

## Referências

- Migração PrimeVue v4: PrimeIcons deixou de ser incluído por padrão.
- Commit desta correção (branch `dev`).
