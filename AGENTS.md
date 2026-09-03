# Provario

## Visão geral

Aplicação web para professores do ensino fundamental elaborarem provas com apoio de I.A.: o sistema gera um prompt para colar num chat de I.A., recebe o retorno em markdown, monta a prova a partir de um template de impressão e permite salvar e imprimir.

## Stack técnica

- Backend: PHP 8.3, Laravel 13, Inertia 3
- Frontend: Vue 3, PrimeVue 4 + `tailwindcss-primeui`, Tailwind 4, TypeScript, Ziggy
- Build: Vite via `vite-plus` (comandos `vp`)
- Pacotes: Composer (PHP), npm (JS)
- Locale padrão: `pt_BR`

## Convenções de código

- Arquitetura backend: Controller → Service → Repository (`app/Http/Controllers`, `app/Services`, `app/Repositories`); models em `app/Models`; form requests em `app/Http/Requests`
- Nomenclatura de domínio em português
- Frontend em `resources/js` (`pages`, `components`, `layouts`, `composables`, `types`, `lib`)
- Lint/format PHP: Pint (preset `laravel`, `pint.json`)
- Análise estática: PHPStan/Larastan nível 7 (`phpstan.neon`)
- Lint/format JS: `vp check`
- `.editorconfig` na raiz

## Documentação adicional

- [docs/constitution/provario.md](docs/constitution/provario.md) — constituição do projeto (visão, princípios, escopo, features)
- [docs/knowledge/INDEX.md](docs/knowledge/INDEX.md) — base de conhecimento (problemas resolvidos)
- [docs/specs/](docs/specs/), [docs/plans/](docs/plans/), [docs/tasks/](docs/tasks/) — artefatos SDD por feature

## Comandos

```bash
composer setup          # instala deps, .env, key, migrate, storage:link, build
composer dev            # sobe ambiente de desenvolvimento (artisan dev)
composer test           # config:clear + pint --test + phpstan + artisan test
composer lint            # pint --parallel
composer ci:check       # npm run check + types:check + testes
php artisan test        # só testes PHP
npm run dev             # vite dev (vp dev)
npm run build           # build de produção
npm run types:check     # vue-tsc --noEmit
```

## Metodologia de Desenvolvimento

O desenvolvimento segue um fluxo spec-anchored (SDD): cada etapa produz um artefato versionado
que ancora a etapa seguinte. Não pule etapas nem comece a implementar sem os artefatos anteriores
aprovados pelo usuário.

1. **Constituição** — `docs/constitution/<slug-do-projeto>.md`
   Documento de fundação do projeto: propósito, princípios inegociáveis e decomposição em
   features distintas. É a referência de escopo de mais alto nível.
2. **Especificações** — `docs/specs/<slug-da-feature>.md`
   Especificação formal de uma feature: problema, público, escopo (dentro/fora), restrições e
   critérios de aceite observáveis. Uma spec por feature.
3. **Planejamento** — `docs/plans/<slug-da-feature>.md`
   Plano técnico derivado da spec aprovada: abordagem, arquivos afetados, decisões de design,
   riscos. Não introduz requisitos novos — apenas o "como" do que a spec definiu.
4. **Tarefas** — `docs/tasks/<slug-da-feature>.md`
   Decomposição do plano em tarefas atômicas e verificáveis, rastreáveis aos critérios de aceite
   da spec.
5. **Implementação (TDD)** — `docs/tasks/<slug-da-feature>.md` (atualiza o progresso)
   Implementação em ciclos red-green-refactor, uma tarefa por vez, marcando o progresso no
   próprio arquivo de tarefas. A suíte de testes roda a cada ciclo.

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
