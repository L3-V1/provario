# Provario

## Visão geral

Aplicação web para professores do ensino fundamental elaborarem provas com apoio de I.A.: o sistema gera um prompt para colar num chat de I.A., recebe o retorno em markdown, monta a prova a partir de um template de impressão A4 (com gabarito na última página) e permite salvar/imprimir pelo navegador. A prova não é persistida no servidor.

## Stack técnica

- Backend: PHP 8.3, Laravel 13, Inertia 3 (Laravel Vue starter kit)
- Frontend: Vue 3, TypeScript, PrimeVue 4 (preset Aura) + `tailwindcss-primeui`, Tailwind 4, Ziggy
- Ícones: `@lucide/vue` (chrome da app) + PrimeIcons `pi pi-*` (dentro de componentes PrimeVue)
- Build: Vite 8 via `vite-plus` (comandos `vp`)
- Banco: SQLite (`database/database.sqlite`); única entidade persistida é `perfis_institucionais`
- Pacotes: Composer (PHP), npm (JS)
- Testes: PHPUnit (backend), Vitest (só o parser de markdown)
- Locale padrão: `pt_BR`

## Convenções de código

- Backend em camadas: Controller → Service → Repository (`app/Http/Controllers`, `app/Services`, `app/Repositories`); repositórios são classes concretas, sem interface; models em `app/Models`; validação em `app/Http/Requests`
- Nomenclatura de domínio e UI em português; termos técnicos e API de framework em inglês
- Frontend por tipo de artefato em `resources/js`: `pages`, `components` (subpasta por feature), `layouts`, `composables`, `lib`, `types`
- Rotas nomeadas com ponto (`perfis.index`, `prova.criar`), consumidas no front via Ziggy `route()`
- Dark mode via classe `.dark` no `<html>`; todo utilitário de cor precisa do par `dark:`
- A folha de impressão (`.folha-impressao`) é tema único: sempre `#fff`/`#000`
- Sem lib de markdown e sem lib/serviço de PDF (decisão de princípio)
- Lint/format PHP: Pint (preset `laravel`, `pint.json`); análise estática: PHPStan/Larastan nível 7 (`phpstan.neon`)
- Lint/format JS: `vp check`; tipos: `vue-tsc --noEmit`; `.editorconfig` na raiz
- Implementação em ciclo TDD (Red → Green → Refactor); suíte verde antes de concluir tarefa

## Documentação adicional

- [docs/blueprint/PROJECT.md](docs/blueprint/PROJECT.md), [ARCHITECTURE.md](docs/blueprint/ARCHITECTURE.md), [DESIGN.md](docs/blueprint/DESIGN.md) — descrição do projeto, stack/padrões e linguagem visual
- [docs/constitution/provario.md](docs/constitution/provario.md) — constituição (visão, princípios, escopo, features, contrato do markdown)
- [docs/knowledge/INDEX.md](docs/knowledge/INDEX.md) — base de conhecimento (problemas resolvidos)
- [docs/specs/](docs/specs/), [docs/plans/](docs/plans/), [docs/tasks/](docs/tasks/) — artefatos SDD por feature

## Comandos

```bash
composer setup          # instala deps, .env, key, migrate, storage:link, build
composer dev            # sobe ambiente de desenvolvimento (artisan dev)
composer test           # config:clear + pint --test + phpstan + artisan test
composer lint           # pint --parallel
composer ci:check       # npm run check + types:check + test + testes PHP
php artisan test        # só testes PHP
npm run dev             # vite dev (vp dev)
npm run build           # build de produção
npm run types:check     # vue-tsc --noEmit
npm run test            # vitest (parser)
```

## Mapa de artefatos do projeto

Índice de onde ficam os artefatos versionados produzidos pelas skills de desenvolvimento.
`<slug-do-projeto>` e `<slug-da-feature>` são definidos ao longo do fluxo (sempre kebab-case);
enquanto não existirem, valem apenas as pastas e o padrão de nome abaixo. O slug de uma feature é
o mesmo em todas as etapas: `docs/specs/checkout.md`, `docs/plans/checkout.md` e
`docs/tasks/checkout.md` referem-se todos à feature `checkout`.

| Artefato                                                      | Local                                                       | Skill que produz                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| Descrição do projeto, arquitetura e design (fase 0, opcional) | `docs/blueprint/PROJECT.md`, `ARCHITECTURE.md`, `DESIGN.md` | `/blueprint`                                         |
| Constituição (propósito + features do projeto)                | `docs/constitution/<slug-do-projeto>.md`                    | `/constitute`, `/setup-project`                      |
| Especificação da feature (critérios de aceite EARS)           | `docs/specs/<slug-da-feature>.md`                           | `/specify`                                           |
| Plano técnico da feature                                      | `docs/plans/<slug-da-feature>.md`                           | `/plan`                                              |
| Tarefas atômicas + progresso da implementação                 | `docs/tasks/<slug-da-feature>.md`                           | `/to-tasks` (produz), `/to-tdd` (atualiza progresso) |
| Base de conhecimento (armadilhas já resolvidas)               | `docs/knowledge/INDEX.md` + `docs/knowledge/<slug>.md`      | `knowledge-base`                                     |

## Regras de Conduta

Obrigatórias para qualquer agente de IA que trabalhe neste projeto:

- **NÃO amplie o escopo do projeto silenciosamente.** Qualquer mudança fora do que foi
  explicitamente pedido precisa ser levantada com o usuário antes.
- **NÃO invente requisitos novos.** Se um requisito não está na spec ou nas instruções do
  usuário, ele não existe — pergunte.
- **NÃO tome decisões de produto ou arquitetura por conta própria.** Apresente as alternativas
  e a recomendação; a decisão é do usuário.
- **SEMPRE faça perguntas ao usuário** quando identificar lacunas nas instruções, ambiguidade
  de escopo, ou quando surgirem dúvidas durante a execução. Preferir perguntar a assumir.
- **PREFIRA interface gráfica ao perguntar ao usuário.** Quando o ambiente oferecer uma
  interface de opções selecionáveis (ex. `AskUserQuestion` na extensão Claude Code no VSCode),
  use-a. Se não houver interface disponível no ambiente, faça as perguntas pelo chat em formato
  de múltipla escolha enumerada, sempre oferecendo e destacando a alternativa recomendada e o
  porquê, dado o contexto atual do projeto.
