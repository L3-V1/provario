# Tarefas — Feature 2: Wizard de criação de prova

**ID:** 02
**Slug:** wizard-criacao-prova

Deriva de [../plans/02-wizard-criacao-prova.md](../plans/02-wizard-criacao-prova.md).
Marcar `[x]` ao concluir. TDD: tarefas RED antes das GREEN correspondentes.

Legenda de estado: `[ ]` pendente · `[~]` em andamento · `[x]` concluída

## Etapa 1 — Rota + Controller

- [x] 1.1 RED: `tests/Feature/Prova/CriarProvaTest.php` — convidado em `GET /prova/criar` → redirect login
- [x] 1.2 RED: professor autenticado → 200 + componente Inertia `prova/Criar`
- [x] 1.3 RED: prop `perfis` só do professor logado, chaves `id, instituicao, escola, professor, logo_url`; sem `logo_path`
- [x] 1.4 RED: professor sem perfis → `perfis` vazio
- [x] 1.5 GREEN: `app/Http/Controllers/ProvaController.php` (`__invoke`, `auth`, reusa `PerfilInstitucionalService::listar`, mapeia perfis)
- [x] 1.6 GREEN: rota `prova.criar` em `routes/web.php` (grupo `auth`)
- [x] 1.7 GREEN: stub `resources/js/pages/prova/Criar.vue` para render passar
- [x] 1.8 REFACTOR: pint + phpstan nível 7 limpos

## Etapa 2 — Tipos e constantes

- [x] 2.1 `resources/js/types/prova.ts`: `PerfilResumo`, `RascunhoProva`, `MATERIAS`, opções de ano

## Etapa 3 — Composable de rascunho

- [x] 3.1 `useRascunhoProva.ts`: estado inicial + `carregar()` tolerante (ausência/JSON inválido/`versao`)
- [x] 3.2 `watch` profundo → grava em `localStorage` `provario:rascunho-prova` (debounce ~200 ms)
- [x] 3.3 `limparRascunho()` remove a chave e reseta estado
- [x] 3.4 Garantir que nunca limpa automaticamente; leitura só no cliente
- [x] 3.5 `npm run types:check` limpo

## Etapa 4 — Builder do prompt

- [x] 4.1 `resources/js/lib/promptProva.ts`: `buildPromptProva(config)` com o texto do spec §4 e interpolação `{materia}/{ano}/{quantidade}`

## Etapa 5 — Componentes dos passos

- [x] 5.1 `PassoConfiguracao.vue` — `Select` matéria (9), `Select` ano (1–9), `InputNumber` quantidade (1–30); expõe validade
- [x] 5.2 `PassoPrompt.vue` — `Textarea` readonly com `buildPromptProva`; botão "Copiar prompt" (`navigator.clipboard`) + toast sucesso/erro
- [x] 5.3 `PassoConteudo.vue` — `Textarea` markdown
- [x] 5.4 `PassoConteudo.vue` — `Select` perfil pré-preenche cabeçalho (não altera perfil; opção "Nenhum" zera `perfil_id`/`logo_url`)
- [x] 5.5 `PassoConteudo.vue` — campos de cabeçalho (`instituicao, escola, disciplina, professor, titulo, bimestre, valor_total`); `disciplina` default = matéria
- [x] 5.6 `PassoConteudo.vue` — seletor `layout` 1/2 colunas (default 1)
- [x] 5.7 `PassoPreview.vue` — cabeçalho montado + `logo_url` + linhas do aluno (nome/turma/data/nota)
- [x] 5.8 `PassoPreview.vue` — `<pre>` do markdown cru + colunas CSS conforme `layout` + aviso de preview parcial
- [x] 5.9 `PassoPreview.vue` — botão "Nova prova" com `useConfirm` + `<ConfirmDialog />` → `limparRascunho()` + volta ao Passo 1

## Etapa 6 — Página + Stepper

- [x] 6.1 `pages/prova/Criar.vue`: props `perfis`, `AppLayout` + `Breadcrumbs` ("Criar prova")
- [x] 6.2 Cabeçalho de passos + navegação ligados ao `passoAtual` do composable
      (lista `<ol>` própria em vez do `Stepper` do PrimeVue — mais simples para o
      gating de avanço; ver Progresso)
- [x] 6.3 Navegação: para trás livre; para frente bloqueada enquanto passo atual inválido
- [x] 6.4 Passo atual persistido no rascunho

## Etapa 7 — Menu

- [x] 7.1 `AppSidebar.vue`: item "Criar prova" → `prova.criar`, ícone `FileText`, `active: route().current('prova.*')`

## Etapa 8 — Fechamento

- [x] 8.1 `composer test` verde: pint + phpstan (nível 7) + 51/51 testes
      (correções de infra pré-existentes aplicadas — ver Progresso)
- [x] 8.2 `npm run build` verde
- [x] 8.3 `npm run types:check` verde
- [x] 8.4 Revisar checklist do spec (seções 3 e 5)
- [x] 8.5 Atualizar este arquivo com o progresso final

## Progresso

### 2026-09-01 — implementação completa

- Etapa 1 (TDD): `CriarProvaTest` escrito primeiro (RED: rota inexistente),
  depois `ProvaController` (`__invoke`) + rota `prova.criar` + página. 4 testes
  verdes; suíte total 51/51.
- `ProvaController` mapeia os perfis para `id, instituicao, escola, professor,
logo_url` (não expõe `logo_path`), reusando `PerfilInstitucionalService::listar`.
- Frontend: `types/prova.ts`, `useRascunhoProva` (localStorage
  `provario:rascunho-prova`, debounce 200 ms, tolerante a JSON/versão inválidos,
  nunca limpa sozinho), `lib/promptProva.ts`, 4 componentes de passo,
  `pages/prova/Criar.vue`, item de menu "Criar prova".
- Desvio de plano: em vez do `Stepper` do PrimeVue, o passo atual é uma lista
  `<ol>` + botões Voltar/Avançar. Avanço do Passo 1 bloqueado até `materia`,
  `ano` e `quantidade >= 1`; voltar é sempre livre. Passo atual persiste no
  rascunho.
- `layout` (1/2 colunas) ficou como campo de topo do `RascunhoProva`, não dentro
  de `cabecalho` — não muda comportamento.
- `npm run build`, `npm run types:check`, `vp check` (arquivos da feature) verdes.

### Correções de infra pré-existentes (aplicadas nesta branch)

Dívida do starter kit que já quebrava `composer test` antes desta feature:

- **pint**: `database/seeders/DatabaseSeeder.php` (newline final) e
  `routes/auth.php` (indentação de method chaining) reformatados — vinham do
  commit inicial, nunca lintados.
- **phpstan**: o erro `Undefined constant Larastan\Larastan\LARAVEL_VERSION`
  era um sintoma, não a causa. Causa real: o `memory_limit` padrão de 128M
  fazia o worker paralelo do PHPStan estourar; na recuperação de erro ele
  recarrega os stubs do Larastan antes do `bootstrap.php` definir a constante.
  Correção: `composer.json` → `"types:check": "phpstan analyse --memory-limit=512M"`.
  Com o limite maior a análise passa limpa (0 erros, nível 7).

### 2026-09-01 — ajustes pós-review do usuário

- Passo 1: novo campo obrigatório `config.conteudo` (`InputText`, "Conteúdo
  didático", ex.: `Genética, Reprodução, Ciclo da Água`). Entra em
  `ConfigProva`, no estado inicial do rascunho e na validação de avanço do
  Passo 1.
- `buildPromptProva`: frase de abertura agora inclui
  "...para o {ano}º ano sobre os seguintes conteúdos: {conteudo}, com
  {quantidade} questões no total.".
- Passo 4: botão "Nova prova" movido de `PassoPreview.vue` para a barra de
  navegação do rodapé em `Criar.vue`, no lugar do "Avançar" (à direita, ao lado
  de "Voltar"). `useConfirm` também migrou para `Criar.vue`.
- `npm run build` e `npm run types:check` verdes.

### Ainda pendente (fora do escopo — decidir depois)

- `npm run check` (`vp check`) acusa formatação de markdown em ~8 arquivos de
  `docs/` e `AGENTS.md` — dívida pré-existente de todo o repositório. Rodar
  `vp check --fix` em tudo é um commit à parte.
