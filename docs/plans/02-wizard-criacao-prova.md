# Plano de implementação — Feature 2: Wizard de criação de prova

**ID:** 02
**Slug:** wizard-criacao-prova

Baseado em [../specs/02-wizard-criacao-prova.md](../specs/02-wizard-criacao-prova.md).
Abordagem TDD RED-GREEN-REFACTOR onde há lógica de servidor; frontend verificado
por `npm run build` + `npm run types:check`. Prova não persistida — nenhuma
migration/model/service/repository novo.

## Ordem das etapas

### Etapa 1 — Rota + Controller (backend)

- RED: `tests/Feature/Prova/CriarProvaTest.php`
    - convidado em `GET /prova/criar` → redirect login.
    - professor autenticado → 200, componente Inertia `prova/Criar`.
    - prop `perfis` traz só os do professor logado, chaves
      `id, instituicao, escola, professor, logo_url`; não vaza `logo_path`.
    - professor sem perfis → `perfis` vazio.
- GREEN:
    - `app/Http/Controllers/ProvaController.php` — single action `__invoke`,
      `middleware('auth')`, reusa `PerfilInstitucionalService::listar`, mapeia perfis.
    - Rota `Route::get('prova/criar', ProvaController::class)->name('prova.criar')`
      no grupo `auth` de `routes/web.php`.
    - Stub mínimo `resources/js/pages/prova/Criar.vue` para o teste de render passar.
- REFACTOR: pint + phpstan nível 7.

### Etapa 2 — Tipos e constantes (frontend)

- `resources/js/types/prova.ts`: `PerfilResumo`, `RascunhoProva`, `MATERIAS`,
  opções de ano.

### Etapa 3 — Composable de rascunho

- `resources/js/composables/useRascunhoProva.ts`:
    - estado inicial vazio; `carregar()` tolerante a ausência/JSON inválido/`versao`.
    - `watch` profundo → grava em `localStorage` (`provario:rascunho-prova`),
      debounce ~200 ms.
    - `limparRascunho()` remove a chave e reseta o estado.
    - nunca limpa sozinho.
- Verificação: `npm run types:check`. (Testes unitários só na feature 3.)

### Etapa 4 — Builder do prompt

- `resources/js/lib/promptProva.ts`: `buildPromptProva(config): string`,
  função pura, texto da seção 4 do spec com `{materia}/{ano}/{quantidade}`.

### Etapa 5 — Componentes dos passos

1. `components/prova/PassoConfiguracao.vue` — `Select` matéria, `Select` ano,
   `InputNumber` quantidade; emite validade.
2. `components/prova/PassoPrompt.vue` — `Textarea` readonly + "Copiar prompt"
   (`navigator.clipboard`) + toast.
3. `components/prova/PassoConteudo.vue` — `Textarea` markdown; `Select` perfil
   (pré-preenche cabeçalho, não mexe no perfil); campos de cabeçalho; `layout` 1/2.
4. `components/prova/PassoPreview.vue` — cabeçalho montado + `logo_url` + linhas do
   aluno + `<pre>` do markdown cru + colunas CSS + aviso + botão "Nova prova"
   (`useConfirm` + `<ConfirmDialog />`).

### Etapa 6 — Página + Stepper

- `pages/prova/Criar.vue`: props `perfis`; `Stepper` PrimeVue; `passoAtual` ligado
  ao composable; navegação para frente bloqueada por passo inválido, para trás livre;
  `AppLayout` + `Breadcrumbs`.

### Etapa 7 — Menu

- `components/AppSidebar.vue`: item "Criar prova" → `prova.criar`, ícone `FileText`,
  `active: route().current('prova.*')`.

### Etapa 8 — Fechamento

- `composer test` verde.
- `npm run build` + `npm run types:check` verdes.
- Revisar checklist do spec (seções 3 e 5).
- Atualizar `docs/tasks/02-wizard-criacao-prova.md` com o progresso.

## Arquivos criados/alterados

**Novos**

- `app/Http/Controllers/ProvaController.php`
- `resources/js/pages/prova/Criar.vue`
- `resources/js/components/prova/PassoConfiguracao.vue`
- `resources/js/components/prova/PassoPrompt.vue`
- `resources/js/components/prova/PassoConteudo.vue`
- `resources/js/components/prova/PassoPreview.vue`
- `resources/js/composables/useRascunhoProva.ts`
- `resources/js/lib/promptProva.ts`
- `resources/js/types/prova.ts`
- `tests/Feature/Prova/CriarProvaTest.php`

**Alterados**

- `routes/web.php` (rota `prova.criar`)
- `resources/js/components/AppSidebar.vue` (item de menu)

## Riscos / pontos de atenção

- `navigator.clipboard` exige contexto seguro (https/localhost) — ok em dev/prod;
  tratar rejeição da Promise com toast de erro.
- `Stepper` do PrimeVue 4: confirmar API (`value` numérico vs slots `StepPanel`).
  Se a versão exigir, controlar os painéis manualmente com `v-if` no `passoAtual`.
- `watch` profundo + `localStorage` a cada tecla: usar debounce para não travar
  digitação em textarea grande.
- SSR/hydration: `localStorage` só existe no cliente — ler dentro de `onMounted`
  ou guardar com `typeof window`.
- `logo_url` do perfil pode ser absoluto do disk `public`; usar direto no `src`.
