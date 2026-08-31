# Ícones em botões de formulário e no `ConfirmDialog`

- **Data:** 2026-08-31
- **Tags:** primevue, vue, ux, confirmdialog, button

## Contexto

PrimeVue 4 + Vue 3. Formulários (`Create`/`Edit` de ativos, categorias, locais,
usuários, perfil) e modais de exclusão via `useConfirm()` / `<ConfirmDialog>`.

## Sintoma

- Botões de submit (`Salvar`, `Atualizar senha`, `Excluir minha conta`, …) sem
  ícone — inconsistentes com o resto da UI, que já usava `pi pi-plus`,
  `pi pi-pencil`, `pi pi-ban`.
- Modais de confirmação de exclusão de categoria/local: estreitos e sem ícone
  de aviso, ao contrário do modal de exclusão de conta.

## Causa raiz

Não é bug; é padrão não aplicado. Dois detalhes não-óbvios do PrimeVue:

1. `confirm.require({ ... })` **não** aceita `class`/`style`/`pt` para a largura
   do diálogo. A largura é definida no componente `<ConfirmDialog>` montado uma
   única vez (no `AppLayout`), e vale para **todas** as chamadas de
   `confirm.require` da aplicação.
2. O ícone do `confirm.require` vem da chave `icon` (string de classe
   PrimeIcons), não é herdado nem automático.

## Solução

Convenção de ícones contextuais nos botões:

| Ação | Ícone |
|---|---|
| Salvar / criar / editar (submit) | `pi pi-save` |
| Atualizar senha | `pi pi-key` |
| Excluir (conta, registro) | `pi pi-trash` |
| Atualizar responsável | `pi pi-user` |
| Confirmar baixa | `pi pi-ban` |
| Cancelar (em modal) | `pi pi-times` |
| Novo X (lista) | `pi pi-plus` |

Modais de confirmação de exclusão — padrão único, espelhando o de exclusão de
conta:

```vue
<!-- AppLayout.vue: instância única, define a largura de todos -->
<ConfirmDialog :style="{ width: '36rem' }" />
```

```ts
confirm.require({
    header: 'Confirmar exclusão',
    icon: 'pi pi-exclamation-triangle', // sempre o ícone de aviso
    message: `Excluir a categoria "${categoria.nome}"?`,
    rejectLabel: 'Cancelar',
    acceptLabel: 'Excluir',
    acceptProps: { severity: 'danger' },
    accept: () => router.delete(route('categorias.destroy', categoria.id)),
});
```

## Como evitar ou detectar antes

- Botão de ação sem `icon=` é sinal de inconsistência — revisar contra a tabela
  acima.
- Toda chamada `confirm.require` de exclusão deve ter
  `icon: 'pi pi-exclamation-triangle'`; a largura já vem do `<ConfirmDialog>`
  global, não repetir por chamada.

## Referências

- `resources/js/layouts/AppLayout.vue`
- `resources/js/pages/settings/Profile.vue`