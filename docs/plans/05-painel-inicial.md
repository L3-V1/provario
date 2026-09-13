# Plano técnico: Painel inicial

**Status:** gerado
**ID:** 05
**Slug:** painel-inicial
**Spec de referência:** docs/specs/05-painel-inicial.md

## Resumo da abordagem

A feature enriquece a página Inertia existente `resources/js/pages/Dashboard.vue`
com quatro blocos, sem nova entidade, sem nova dependência e sem novo item de
menu. Todo o estado de rascunho continua no `localStorage`, lido pelo composable
existente `useRascunhoProva`, que passa a expor também um `computed temRascunho`
(fonte única da regra de AC-02). O único trabalho de backend é o
`DashboardController` deixar de renderizar `Dashboard` sem props e passar a
injetar `PerfilInstitucionalService` e enviar a prop `perfis` — usando o mesmo
mapeamento inline que o `ProvaController` já faz.

No frontend, `Dashboard.vue` vira apenas um compositor: recebe a prop `perfis`,
usa `useRascunhoProva`, e monta quatro componentes novos em
`resources/js/components/painel/` — `CardRascunho.vue`, `AtalhosRapidos.vue`,
`ResumoPerfis.vue`, `GuiaFluxo.vue`. Navegação e confirmação reaproveitam os
padrões já usados no projeto (`Button :as="Link" :href="route(...)"`,
`useConfirm()` do PrimeVue, `pi pi-*` para ícones dentro de componentes PrimeVue,
`@lucide/vue` no chrome quando fizer sentido). Todo utilitário de cor com par
`dark:`.

## Pontos de integração

- **`app/Http/Controllers/DashboardController.php`** — passa a injetar
  `PerfilInstitucionalService` no construtor e a enviar a prop `perfis`
  (`Inertia::render('Dashboard', ['perfis' => ...])`).
- **`app/Services/PerfilInstitucionalService::listar(User)`** — reutilizado como
  está; devolve `Collection<PerfilInstitucional>`.
- **`resources/js/composables/useRascunhoProva.ts`** — passa a exportar
  `temRascunho` (computed) além de `rascunho` e `limparRascunho`. Nenhuma mudança
  no comportamento de leitura/gravação/limpeza atual.
- **`resources/js/pages/Dashboard.vue`** — reescrito como compositor dos quatro
  blocos; mantém `Head`, `PageHeader` e o layout persistente `AppLayout`
  (resolvido em `app.ts`).
- **`resources/js/types/prova.ts`** — o tipo `PerfilResumo` já existe e cobre o
  payload de `perfis`; reutilizado (sem novo tipo).
- **Rotas Ziggy** já existentes e nomeadas: `prova.criar`, `perfis.index`,
  `perfis.create`, `dashboard`. Nenhuma rota nova.
- **`routes/web.php`** — sem alteração (a rota `dashboard` continua apontando
  para o mesmo controller `__invoke`).

## Decisões de arquitetura

### Decisão: onde fica a regra "existe rascunho?" (AC-02)

- Opções consideradas:
    - **A** — estender `useRascunhoProva` com um `computed temRascunho`.
    - **B** — computar inline dentro de `CardRascunho.vue`.
    - **C** — novo composable `usePainelRascunho`.
- Escolhida: **A**.
- Motivo: fonte única da regra, reutilizável, e mantém o `CardRascunho.vue` só
  como consumidor. Toca um arquivo já existente sem alterar o comportamento
  atual de leitura/gravação/limpeza. Regra: `temRascunho` é verdadeiro quando
  `rascunho.passoAtual > 1` OU `rascunho.config.materia`, `rascunho.config.ano`
  ou `rascunho.config.quantidade` não nulos OU `rascunho.conteudo.markdown`
  não vazio (após `trim`).

### Decisão: como o `DashboardController` monta a prop `perfis`

- Opções consideradas:
    - **A** — `.map(...)->values()` inline no controller, idêntico ao
      `ProvaController`.
    - **B** — extrair `PerfilInstitucionalService::listarResumo(User)` e passar a
      usar em ambos os controllers.
- Escolhida: **A**.
- Motivo: consistência com o código atual e princípio "simplicidade acima de
  flexibilidade". A duplicação do mapeamento (`id`, `instituicao`, `escola`,
  `professor`, `logo_url`) é pequena e fica registrada como débito aceito
  (ver "Fora do escopo deste plano"). Evita mexer em `perfis-institucionais` e
  `wizard-criacao-prova`, features já concluídas.

### Decisão: granularidade dos componentes do painel

- Opções consideradas:
    - **A** — 4 componentes (um por bloco).
    - **B** — tudo em `Dashboard.vue`.
    - **C** — 2 componentes agrupados.
- Escolhida: **A** — `components/painel/CardRascunho.vue`,
  `AtalhosRapidos.vue`, `ResumoPerfis.vue`, `GuiaFluxo.vue`.
- Motivo: espelha 1:1 os blocos da spec, mantém `Dashboard.vue` fino (só
  composição + props), e cria a subpasta `components/painel/` prevista na
  constituição. `GuiaFluxo.vue` e `AtalhosRapidos.vue` não recebem dados;
  `CardRascunho.vue` consome `useRascunhoProva`; `ResumoPerfis.vue` recebe
  `perfis` por prop.

### Decisão: navegação e confirmação

- Opções consideradas: `<Link>` puro, `router.visit()`, `Button :as="Link"`.
- Escolhida: reutilizar o padrão já presente no projeto —
  `Button :as="Link" :href="route(...)"` para CTAs/atalhos e `useConfirm()` do
  PrimeVue para o `ConfirmDialog` de "Nova prova" (mesmo padrão de
  `perfis/Index.vue`).
- Motivo: zero novidade; consistência visual e de comportamento.

## Impacto em dados

- Nenhum. Sem migração, sem nova tabela, sem mudança de schema. `perfis` é
  apenas leitura via `PerfilInstitucionalService::listar`. O rascunho continua
  100% no `localStorage` do cliente.

## Riscos e mitigação

- **Falso positivo/negativo em `temRascunho`** — o estado inicial do composable
  tem todos os campos "vazios" (`null`/`''`), então a regra precisa cobrir
  exatamente config + passo + markdown. Mitigação: derivar de campos explícitos
  e cobrir os estados no teste manual (com e sem rascunho, rascunho só com
  matéria, rascunho no passo 3). Sem Vitest (constituição).
- **`localStorage` indisponível / JSON inválido (AC-13)** — já tratado pelo
  `carregar()` do composable, que devolve estado inicial sem lançar; o painel
  cai em "sem rascunho". Mitigação: nenhuma extra além de não acessar
  `window.localStorage` fora do composable.
- **Dark mode** — todo utilitário de cor nos 4 componentes precisa do par
  `dark:`. Mitigação: revisão visual clara/escura antes de concluir.
- **Estados vazios** — `ResumoPerfis.vue` sem perfis (AC-11/AC-15) e
  `CardRascunho.vue` sem rascunho (AC-07). Mitigação: componente renderiza
  estado vazio com CTA; nenhum bloco depende do outro.
- Risco geral baixo; nenhum spike necessário antes da decomposição em tarefas.

## Fora do escopo deste plano

- Extrair `PerfilInstitucionalService::listarResumo` / DTO compartilhado —
  débito de duplicação aceito; reavaliar se um terceiro consumidor aparecer.
- Testes do composable `useRascunhoProva` em Vitest (constituição: Vitest só
  cobre o parser).
- Abstração genérica de "stat/widget" reutilizável — os 4 componentes nascem
  específicos; padronizar só quando houver segundo caso de uso.
- Responsividade além de um grid simples (Tailwind) para os blocos.
- Qualquer item de menu novo (o Dashboard já está no `AppSidebar`).
- Persistir prova, histórico, duplicação — fora do projeto.

## Rastreabilidade

| AC    | Cobertura no plano                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------ |
| AC-01 | `Dashboard.vue` compõe os 4 componentes de `components/painel/`                                              |
| AC-02 | `computed temRascunho` em `useRascunhoProva.ts` (Decisão 1)                                                  |
| AC-03 | `CardRascunho.vue` lê `rascunho` e renderiza matéria/ano/quantidade/passo + botões                           |
| AC-04 | `CardRascunho.vue` "Retomar" → `Button :as="Link" :href="route('prova.criar')"`, sem tocar no rascunho       |
| AC-05 | `CardRascunho.vue` "Nova prova" → `useConfirm().require(...)` antes de qualquer ação                         |
| AC-06 | `accept` do `ConfirmDialog` chama `limparRascunho()`; `temRascunho` reativo troca o card para o estado vazio |
| AC-07 | `CardRascunho.vue` renderiza só a CTA "Criar prova" quando `!temRascunho`                                    |
| AC-08 | `AtalhosRapidos.vue` com 3 `Button :as="Link"` para `prova.criar`, `perfis.create`, `perfis.index`           |
| AC-09 | `DashboardController` injeta `PerfilInstitucionalService` e envia prop `perfis` (map inline, Decisão 2)      |
| AC-10 | `ResumoPerfis.vue` itera `perfis` (logo, instituição, escola) + link para `perfis.index`                     |
| AC-11 | `ResumoPerfis.vue` estado vazio com CTA `perfis.create` quando `perfis.length === 0`                         |
| AC-12 | `GuiaFluxo.vue` — markup estático dos 4 passos + lembrete do contrato de markdown                            |
| AC-13 | Tratado pelo `carregar()` existente do composable; painel não acessa `localStorage` direto                   |
| AC-14 | `reject`/fechamento do `ConfirmDialog` não chama `limparRascunho()`; card inalterado                         |
| AC-15 | `ResumoPerfis.vue` trata `perfis` vazio/ausente como estado vazio (AC-11), isolado dos demais blocos         |
| AC-16 | Nenhum código do painel chama `limparRascunho()` fora do `accept` do `ConfirmDialog` de "Nova prova"         |

Todos os `AC-XX` da spec têm cobertura técnica definida. Nenhum pendente.

## Próximos passos

Próxima etapa: `/to-tasks painel-inicial`
