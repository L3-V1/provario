# Arquitetura — Provario

> Etapa 2 do blueprint, criada retroativamente a partir da constituição
> (`docs/constitution/provario.md`) e do código existente. Reflete a stack e os
> padrões já em uso no repositório.

## Stack técnica

- **Backend:** PHP 8.3, Laravel 13, Inertia 3 (Laravel Vue starter kit).
- **Frontend:** Vue 3, TypeScript, PrimeVue 4 (`@primevue/themes` preset Aura) +
  `tailwindcss-primeui`, Tailwind 4, Ziggy.
- **Ícones:** `@lucide/vue` (navegação e chrome da app) + PrimeIcons (`pi pi-*`,
  usado dentro de componentes PrimeVue como `Button`/`ConfirmDialog`).
- **Fonte:** `@fontsource/geist-sans` (Geist Sans).
- **Build:** Vite 8 via `vite-plus` (comandos `vp`: `vp dev`, `vp build`,
  `vp check`).
- **Banco de dados:** SQLite (padrão do starter kit; `database/database.sqlite`).
  Único dado persistido é a tabela de perfis institucionais.
- **Gerenciadores de pacote:** Composer (PHP), npm (JS). `pnpm-workspace.yaml`
  presente por herança do starter kit, mas o fluxo oficial é npm.
- **Testes:** PHPUnit (backend), Vitest (exclusivamente o parser de markdown).

## Padrão arquitetural

- **Backend em camadas: Controller → Service → Repository.**
    - `app/Http/Controllers` — recebem a requisição, delegam ao Service, devolvem
      resposta Inertia.
    - `app/Http/Requests` — form requests para validação.
    - `app/Services` — regra de negócio e orquestração (ex.: upload de logo).
    - `app/Repositories` — acesso a dados. **Classes concretas, sem interface.**
    - `app/Models` — models Eloquent (ex.: `PerfilInstitucional`).
    - Motivo: separação testável e previsível sem a cerimônia de contratos/DI que o
      tamanho do projeto não justifica (princípio "simplicidade acima de
      flexibilidade").
- **Frontend por tipo de artefato**, dentro de `resources/js`: `pages`,
  `components` (com subpasta por feature quando útil, ex.: `components/prova/`),
  `layouts`, `composables`, `lib`, `types`.
- **Sem persistência da prova:** o estado do wizard vive em `localStorage` via o
  composable `useRascunhoProva`; o parser roda 100% no cliente.
- **Monolito único** Laravel + Inertia; sem serviços separados, sem API REST
  pública. Rotas nomeadas expostas ao front via Ziggy.

## Estrutura de pastas

```
app/
  Http/
    Controllers/        # 1 controller por recurso
    Requests/           # form requests de validação
  Models/               # models Eloquent (domínio em português)
  Services/             # regra de negócio
  Repositories/         # acesso a dados, classes concretas
database/
  migrations/
  factories/
resources/
  css/app.css           # Tailwind 4 + camada @layer + CSS de impressão
  js/
    app.ts              # bootstrap Inertia + PrimeVue (preset Aura + ptBR)
    pages/              # páginas Inertia, espelham nomes de rota
      auth/  perfis/  prova/  settings/
    components/
      prova/            # componentes do wizard e do preview
    layouts/            # AppLayout (app), AuthLayout (login/registro)
    composables/        # useAppearance, useRascunhoProva
    lib/                # parserProva.ts (+ .test.ts), promptProva.ts,
                        # datetime.ts, primevue-ptbr.ts
    types/              # tipos por domínio (perfil, prova, navigation, ui, auth)
routes/
docs/
  blueprint/            # PROJECT.md, ARCHITECTURE.md, DESIGN.md (esta etapa)
  constitution/         # provario.md
  specs/ plans/ tasks/  # artefatos SDD por feature
  knowledge/            # base de conhecimento (problemas resolvidos)
```

## Convenções de código

- **Idioma:** domínio e UI em **português** (`PerfilInstitucional`, `prova`,
  `perfis.index`, "Criar prova"). Termos técnicos e API de framework em inglês.
- **PHP:** PSR-4 (`App\`), Pint preset `laravel`. Classes `PascalCase`, métodos
  `camelCase`.
- **Vue/TS:** componentes `PascalCase.vue`; composables `useAlgo.ts`; libs
  `camelCase.ts`. `<script setup lang="ts">` em todos os componentes. Imports de
  app via alias `@/`.
- **Rotas:** nomes com ponto (`perfis.index`, `prova.criar`, `profile.edit`),
  consumidas no front por `route()` da Ziggy.
- **CSS:** Tailwind utility-first; ordem de camadas
  `theme, base, primevue, components, utilities` (mantida em sincronia entre
  `app.css` e a opção `cssLayer.order` do PrimeVue). Dark mode via classe `.dark`
  no `<html>` (`@custom-variant dark`).
- **Linters/formatters:** Pint (`pint.json`), PHPStan/Larastan nível 7
  (`phpstan.neon`), `vp check` (lint+format JS), `vue-tsc --noEmit` (tipos).
  `.editorconfig` na raiz.
- **Testes:** TDD (Red → Green → Refactor); suíte verde antes de concluir tarefa.
  Vitest cobre apenas `lib/parserProva.ts`.

### Comandos

```bash
composer setup       # instala deps, .env, key, migrate, storage:link, build
composer dev         # ambiente de desenvolvimento (artisan dev)
composer test        # config:clear + pint --test + phpstan + artisan test
composer lint        # pint --parallel
composer ci:check    # npm run check + types:check + test
php artisan test     # só testes PHP
npm run dev          # vite dev (vp dev)
npm run build        # build de produção
npm run types:check  # vue-tsc --noEmit
npm run test         # vitest (parser)
```

## Integrações e dependências externas

- **Nenhuma integração de rede em runtime.** A I.A. é acionada fora do sistema
  (o professor copia o prompt e cola o retorno).
- **Storage do Laravel** para o logo do perfil institucional (disco local,
  `storage:link`).
- **Autenticação:** cadastro público + login herdados do Laravel Vue starter kit;
  sem provedor externo, sem OAuth.

## Restrições e decisões

- **Sem lib de markdown e sem lib/serviço de PDF** — decisão de princípio.
  Parser próprio em TS; impressão só via `window.print()` + `@media print`.
- **Repositórios sem interface** — concretos, injetados direto. Reavaliar só se
  surgir necessidade real de troca de implementação.
- **Prova não persistida** — única entidade no banco é `perfis_institucionais`.
  Rascunho em `localStorage`, limpo apenas no clique em "Nova prova".
- **Sem navegação global transversal centralizada além do `AppSidebar`** — cada
  feature registra seus próprios itens de menu conforme necessário.
- **Escala:** uso individual; SQLite é suficiente. Sem fila, cache distribuído ou
  requisitos de concorrência.
- **Deploy:** não definido formalmente nesta fase; premissa é servidor PHP único
  com SQLite e disco local para o storage.
- **Metodologia SDD:** nunca pular etapas, nunca avançar sem aprovação explícita
  do usuário (ver `AGENTS.md` › Regras de Conduta).
