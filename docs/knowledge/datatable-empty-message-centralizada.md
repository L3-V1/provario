# Mensagem de conteúdo vazio do `DataTable` não centralizada

- **Data:** 2026-09-03
- **Tags:** primevue, datatable, vue, layout, ux
- **Status:** resolvido

## Contexto

Laravel 13 + Inertia 3 + Vue 3.5 + PrimeVue 4.5 (styled mode, tema Aura) +
Tailwind v4. Ocorre ao implementar módulos novos a partir deste template: telas
de listagem (`*/Index.vue`) que usam `<DataTable>` do PrimeVue.

## Sintoma

Quando a tabela não tem registros, o texto de estado vazio (ex. "Nenhum registro
encontrado") aparece colado à esquerda da primeira coluna, sem respiro vertical,
destoando do resto da tela. O mesmo vale para o estado de carregamento.

## Causa raiz

O slot `#empty` (e `#loading`) do PrimeVue não aplica nenhum alinhamento por
padrão — renderiza o conteúdo bruto dentro de uma célula que ocupa a largura da
tabela. A prop `emptyMessage` só troca o texto, não o alinhamento. Agentes
tendem a preencher apenas a string e deixar o layout como está.

## Solução

Todo `<DataTable>` novo define o slot `#empty` com um wrapper centralizado e com
padding vertical:

```vue
<template #empty>
    <div
        class="flex flex-col items-center justify-center gap-2 py-10 text-surface-500"
    >
        <i class="pi pi-inbox text-2xl" />
        <span>Nenhum registro encontrado.</span>
    </div>
</template>
```

Mesmo padrão para o slot `#loading` quando houver carregamento assíncrono
(trocar o ícone por `pi pi-spinner pi-spin` e o texto por "Carregando...").

## Como evitar ou detectar antes

- `grep -rn "#empty" resources/js` — toda ocorrência deve ter um wrapper com
  `flex ... items-center justify-center` e `py-*`; texto solto no slot é sinal
  de alerta.
- Ao revisar tela de listagem, testar com a tabela vazia (filtro sem resultado
  ou tabela recém-criada) e confirmar que a mensagem fica centralizada.
- `DataTable` novo já nasce com o slot `#empty` no formato acima.

## Referências

- `resources/js/pages/*/Index.vue` (quando existirem telas de listagem)
- https://primevue.org/datatable/#empty
- `docs/knowledge/primevue-card-largura-total.md`
