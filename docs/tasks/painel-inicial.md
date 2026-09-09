# Tarefas: Painel inicial

**Status:** gerado
**Slug:** painel-inicial
**Plano de referência:** docs/plans/painel-inicial.md
**Paralelização:** não

- [x] **T-01** — `computed temRascunho` em `useRascunhoProva`
    - **Cobre:** AC-02, AC-13
    - **Depende de:** nenhuma
    - **Complexidade:** baixa
    - **Pronto quando:** `useRascunhoProva()` retorna `{ rascunho, temRascunho, limparRascunho }`; `temRascunho` é `true` quando `passoAtual > 1` OU `config.materia`/`config.ano`/`config.quantidade` não nulos OU `conteudo.markdown` não vazio após `trim`, e `false` no estado inicial; comportamento de leitura/gravação/limpeza inalterado; `npm run types:check` e `vp check` verdes

- [x] **T-02** — `DashboardController` envia prop `perfis`
    - **Cobre:** AC-09
    - **Depende de:** nenhuma
    - **Complexidade:** baixa
    - **Pronto quando:** controller injeta `PerfilInstitucionalService` e renderiza `Dashboard` com `perfis` mapeado inline (`id`, `instituicao`, `escola`, `professor`, `logo_url`) escopado ao `$request->user()`, igual ao `ProvaController`; teste PHPUnit novo cobre que a rota `dashboard` devolve a prop `perfis` com os perfis do professor logado; `php artisan test`, Pint e PHPStan nível 7 verdes

- [x] **T-03** — Componente `components/painel/GuiaFluxo.vue`
    - **Cobre:** AC-12
    - **Depende de:** nenhuma
    - **Complexidade:** baixa
    - **Pronto quando:** componente estático (sem props, sem dados) renderiza os passos configurar → gerar prompt → colar markdown da I.A. → pré-visualizar/imprimir e um lembrete do contrato de formato do markdown; cores com par `dark:`; `types:check` e `vp check` verdes; revisão visual clara/escura

- [x] **T-04** — Componente `components/painel/AtalhosRapidos.vue`
    - **Cobre:** AC-08
    - **Depende de:** nenhuma
    - **Complexidade:** baixa
    - **Pronto quando:** componente exibe sempre as 3 ações — "Criar prova" (`route('prova.criar')`), "Novo perfil" (`route('perfis.create')`), "Gerenciar perfis" (`route('perfis.index')`) — como `Button :as="Link" :href="route(...)"`; cores com par `dark:`; `types:check` e `vp check` verdes

- [x] **T-05** — Componente `components/painel/ResumoPerfis.vue`
    - **Cobre:** AC-10, AC-11, AC-15
    - **Depende de:** nenhuma
    - **Complexidade:** baixa
    - **Pronto quando:** recebe prop `perfis: PerfilResumo[]`; com perfis, lista todos (logo, instituição, escola) + link para `route('perfis.index')`; com `perfis` vazio/ausente, mostra estado vazio com CTA para `route('perfis.create')`; renderização isolada (não quebra se prop vier vazia); cores com par `dark:`; `types:check` e `vp check` verdes; revisão visual clara/escura

- [x] **T-06** — Componente `components/painel/CardRascunho.vue`
    - **Cobre:** AC-03, AC-04, AC-05, AC-06, AC-07, AC-14, AC-16
    - **Depende de:** T-01
    - **Complexidade:** média
    - **Pronto quando:** usa `useRascunhoProva`; com `temRascunho`, exibe matéria, ano, quantidade de questões, passo atual (1–4), botão "Retomar" (`Button :as="Link" :href="route('prova.criar')"`, não altera o rascunho) e botão "Nova prova" que abre `useConfirm().require(...)`; `accept` chama `limparRascunho()` e o card passa a exibir o estado sem rascunho; `reject`/fechar não altera o rascunho; sem `temRascunho`, exibe só a CTA "Criar prova" (`route('prova.criar')`); nenhuma chamada a `limparRascunho()` fora do `accept`; cores com par `dark:`; `types:check` e `vp check` verdes; revisão manual dos estados (sem rascunho / só matéria / passo 3 / cancelar confirmação)

- [x] **T-07** — Wiring de `pages/Dashboard.vue`
    - **Cobre:** AC-01, AC-13
    - **Depende de:** T-01, T-02, T-03, T-04, T-05, T-06
    - **Complexidade:** baixa
    - **Pronto quando:** `Dashboard.vue` recebe a prop `perfis: PerfilResumo[]`, mantém `Head`/`PageHeader`/`AppLayout` e compõe os 4 blocos (`CardRascunho`, `AtalhosRapidos`, `ResumoPerfis :perfis`, `GuiaFluxo`) num grid simples; nenhum acesso direto a `window.localStorage` na página (só via composable); `ConfirmDialog` disponível na árvore; `npm run ci:check` verde; revisão visual clara/escura com e sem rascunho, com e sem perfis

## Grupos paralelizáveis

Implementação sequencial (decisão do usuário). Ordem: T-01 → T-02 → T-03 → T-04 → T-05 → T-06 → T-07.

Independentes entre si (caso a decisão mude): T-01, T-02, T-03, T-04, T-05. T-06 depende de T-01. T-07 depende de todas.

## Rastreabilidade reversa

- AC-01 → T-07
- AC-02 → T-01
- AC-03 → T-06
- AC-04 → T-06
- AC-05 → T-06
- AC-06 → T-06
- AC-07 → T-06
- AC-08 → T-04
- AC-09 → T-02
- AC-10 → T-05
- AC-11 → T-05
- AC-12 → T-03
- AC-13 → T-01, T-07
- AC-14 → T-06
- AC-15 → T-05
- AC-16 → T-06

Todos os 16 `AC-XX` da spec estão cobertos.

## Próximos passos

Próxima etapa: `/to-tdd painel-inicial`
