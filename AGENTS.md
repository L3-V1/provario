# vilt-template

## Visão geral

Starter kit Laravel + Vue (Inertia) usado como template para novos projetos. Reconstruído em 2026-08-31 a partir do Laravel Vue starter kit oficial, com Fortify e ferramentas de IA removidos.

## Stack técnica

- **Backend**: PHP 8.3, Laravel 13, Inertia Laravel 3, Ziggy (`tightenco/ziggy`). Gerenciador: Composer.
- **Frontend**: Vue 3.5, TypeScript, PrimeVue 4.5 (tema Aura, styled mode) + `tailwindcss-primeui`, Tailwind v4 (estilo complementar), ícones `@lucide/vue`, `ziggy-js`. Build: Vite 8 via `vite-plus` (`vp`). Gerenciador: npm.
- **Inertia**: SSR desligado. Layout por convenção de nome de página (`auth/*` -> AuthLayout, resto -> AppLayout).
- **Auth**: customizada (sem Fortify), padrão Breeze — `routes/auth.php`, controllers em `app/Http/Controllers/Auth/`. Sem reset de senha nem verificação de e-mail.
- **i18n**: `laravel-lang/common`, locale `pt_BR`, timezone `America/Sao_Paulo`.
- **DB**: SQLite (`database/database.sqlite`).

## Convenções de código

- Arquitetura: **Controller -> Service -> Repository**. Services em `app/Services/`, repositórios (classes concretas, sem interface) em `app/Repositories/`. FormRequests para validação server-side.
- Nomenclatura de domínio em português.
- Lint/format PHP: **Pint** (preset `laravel`). Análise estática: **PHPStan/Larastan** nível 7 (rodar com `-d memory_limit=1G`).
- Lint/format front: **vite-plus** (`vp`), não ESLint/Prettier. Types: `vue-tsc`.
- `.editorconfig` na raiz define whitespace/indent.
- Flash/toast via `Inertia::flash('toast', [...])` -> `components/FlashToasts.vue`. Datas via `resources/js/lib/datetime.ts`.

## Comandos

```bash
composer setup          # instala deps, .env, key, migrate, npm install + build
composer dev            # sobe app (php artisan dev: server + queue + vite)
npm run dev             # só o Vite dev server
composer test           # config:clear + pint --test + phpstan + artisan test
composer ci:check       # npm run check + types:check + test
npm run check           # lint + format front
npm run check:fix       # lint + format front, aplicando correções
npm run types:check     # vue-tsc --noEmit
php artisan test        # só a suíte PHPUnit
```
