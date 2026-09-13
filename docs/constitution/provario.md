# Constituição: Provario (MVP)

Documento consolidado a partir de entrevista técnica de levantamento de
requisitos e da entrevista de escopo. Todas as decisões abaixo foram
respondidas pelo usuário; nada foi inventado. É a referência única para as
etapas 2 a 5 (Spec → Plano → Tarefas → Implementação).

Blueprint do projeto (criado retroativamente, alimenta esta constituição):

- [`docs/blueprint/PROJECT.md`](../blueprint/PROJECT.md) — descrição completa do projeto
- [`docs/blueprint/ARCHITECTURE.md`](../blueprint/ARCHITECTURE.md) — stack e padrões
- [`docs/blueprint/DESIGN.md`](../blueprint/DESIGN.md) — linguagem visual

## Visão / Problema

Aplicação web para professores do ensino fundamental elaborarem provas com
apoio de I.A. Fluxo:

1. O professor configura variáveis como matéria, ano e quantidade de questões.
2. O sistema gera um prompt pronto para copiar e colar em algum chat de I.A.
3. A I.A. devolve um conteúdo em markdown.
4. O professor preenche os campos do template de impressão (cabeçalho e logo
   institucional).
5. O professor cola o markdown gerado pela I.A. no campo das questões.
6. O sistema monta uma pré-visualização da prova, que o professor pode salvar
   (via impressão do navegador) e imprimir.

## Usuários-alvo

Professores do ensino fundamental. Autenticação reaproveita o cadastro público
já existente no template. Sem papéis/permissões.

## Princípios (não-negociáveis)

- Simplicidade acima de flexibilidade.
- Nenhuma dependência nova sem justificativa. Em particular: sem lib de
  markdown, sem lib/serviço de geração de PDF.
- A prova **não** é persistida no servidor. Única entidade persistida:
  "perfis institucionais".
- Rascunho do wizard vive em `localStorage`; limpo **apenas** quando o
  professor clica em "Nova prova" — nunca automaticamente, nem após imprimir.
- Impressão só via navegador (`window.print()` + CSS `@media print`).
- Nomenclatura de domínio em português.
- Metodologia SDD: nunca pular etapas, nunca avançar sem aprovação explícita.

## Stack e restrições técnicas

- Backend: PHP 8.3, Laravel 13, Inertia 3 (Laravel Vue starter kit).
- Frontend: Vue 3, PrimeVue 4 (tema Aura padrão, sem identidade visual
  institucional) + `tailwindcss-primeui`, Tailwind 4, TypeScript, Ziggy.
- Build: Vite 8 via `vite-plus` (comandos `vp`).
- Arquitetura backend: Controller → Service → Repository. Repositórios são
  classes concretas, sem interface. Models em `app/Models`.
- Frontend em `resources/js` (`pages`, `components`, `layouts`, `composables`,
  `types`).
- Parser do markdown implementado em TypeScript no frontend, sem lib de
  markdown.
- Vitest a ser adicionado como dependência de teste, exclusivamente para
  cobrir o parser.
- Armazenamento de logo via storage do Laravel.
- Locale padrão: `pt_BR`.
- Sem menu/navegação global transversal: cada feature adiciona os próprios
  itens de menu conforme necessário.

## Padrões de qualidade (DoD global)

- Lint/format PHP: Pint (preset `laravel`).
- Análise estática: PHPStan/Larastan nível 7.
- Lint/format JS: `vp check`; tipos: `npm run types:check`.
- Implementação em ciclo TDD (Red → Green → Refactor). Suíte de testes verde
  antes de marcar uma tarefa como concluída.
- O parser de markdown tem cobertura de teste dedicada (Vitest).

## Escopo do projeto

### Dentro

- Wizard de 4 passos para montar a prova (detalhe abaixo).
- CRUD de perfis institucionais.
- Painel inicial (dashboard) útil: retomar rascunho, atalhos, resumo de
  perfis e guia do fluxo (detalhe abaixo).
- Parser do contrato de markdown (seção "Contrato de formato do markdown").
- Template de impressão A4 com gabarito.
- Tipos de questão: múltipla escolha (a–e) e verdadeiro ou falso.

### Fora

- Geração de PDF no servidor.
- Mais de um logo no cabeçalho.
- Formatação além de negrito/itálico no enunciado (tabelas, listas, imagens,
  código).
- Questões dissertativas e de complete/associação.
- Papéis/permissões de usuário.
- Identidade visual institucional/branding.
- Histórico, reabertura ou duplicação de provas geradas.

## Features do projeto

<!-- O número de cada feature é o ID dela (2 dígitos, zero à esquerda), na ordem de
     listagem. Ele prefixa os arquivos de spec/plano/tarefas como `NN-<slug>`. IDs são
     estáveis e não reaproveitados: ao atualizar esta constituição, features novas
     recebem o próximo ID livre (maior ID atual + 1). Dependências ficam por slug. -->

### 01. Perfis institucionais (`perfis-institucionais`)

CRUD de perfis institucionais (única entidade persistida).

**Depende de:** nenhuma
**Prioridade:** Alta
**Status:** Concluída

### 02. Wizard de criação de prova (`wizard-criacao-prova`)

Wizard de 4 passos; rascunho em localStorage; preview mínimo até o parser
entrar.

**Depende de:** `perfis-institucionais`
**Prioridade:** Alta
**Status:** Concluída

### 03. Parser do markdown (`parser-markdown`)

Parser TypeScript do contrato de markdown, com Vitest; integra ao passo 4.

**Depende de:** `wizard-criacao-prova`
**Prioridade:** Alta
**Status:** Concluída

### 04. Template de impressão (`template-impressao`)

Folha A4 para impressão via navegador, alimentada pelo parser.

**Depende de:** `wizard-criacao-prova`, `parser-markdown`
**Prioridade:** Alta
**Status:** Concluída

### 05. Painel inicial (`painel-inicial`)

Dashboard com card de rascunho, atalhos, resumo de perfis e guia do fluxo.

**Depende de:** nenhuma (só rotas e o rascunho já existentes)
**Prioridade:** Média
**Status:** Concluída

### Decisões de escopo (entrevista)

- As features `wizard-criacao-prova` e `template-impressao` permanecem
  **separadas**, apesar do acoplamento entre o preview e o template.
- A ordem de implementação inverte Wizard e Parser: o Wizard é construído
  antes do Parser. O passo 4 do wizard fica com um preview mínimo até
  `parser-markdown` entrar.

### Ordem de implementação

1. `01-perfis-institucionais`
2. `02-wizard-criacao-prova`
3. `03-parser-markdown`
4. `04-template-impressao`
5. `05-painel-inicial` (pós-MVP; depende só de rotas e do rascunho já existentes)

---

## Detalhamento (referência para specs, planos e tarefas)

### Feature `perfis-institucionais`

Única entidade persistida no servidor. CRUD completo, escopado ao professor
logado; um professor pode ter **vários** perfis (ex.: mais de uma escola).

- Campos: nome da instituição, nome da escola, nome do professor, logo
  (upload de um único arquivo de imagem por perfil).
- Backend: migration + model `PerfilInstitucional`, arquitetura
  Controller → Service → Repository (repositório concreto, sem interface).
- Frontend: páginas Inertia de listagem, criação, edição e exclusão.
- Armazenamento do logo via storage do Laravel.
- Adiciona item de menu para acesso ao CRUD.

### Feature `wizard-criacao-prova`

Wizard de 4 passos. A prova **não** é persistida no servidor; o estado fica em
`localStorage` e só é limpo quando o professor clica em "Nova prova".

- **Passo 1 — Configuração:**
    - Matéria (select fechado, 9 opções): Português, Matemática, Ciências,
      História, Geografia, Arte, Inglês, Educação Física, Ensino Religioso.
    - Ano (select fechado): 1º ao 9º ano do ensino fundamental.
    - Quantidade de questões (numérico).
- **Passo 2 — Prompt:** monta o texto a partir de template fixo com as
  variáveis do passo 1; textarea somente leitura; botão "Copiar prompt"
  (`navigator.clipboard`). O prompt exige o formato markdown estrito da seção
  "Contrato de formato do markdown", incluindo gabarito, e deixa a I.A.
  decidir livremente a mistura entre múltipla escolha e verdadeiro/falso.
- **Passo 3 — Conteúdo e cabeçalho:** textarea para colar o markdown da I.A.;
  seleção opcional de perfil institucional salvo que pré-preenche o cabeçalho
  (editar os campos **não** altera o perfil salvo); campos de cabeçalho
  (ver "Campos do cabeçalho da prova"); escolha de layout 1 ou 2 colunas.
- **Passo 4 — Pré-visualização:** preview mínimo nesta feature (parse completo
  chega em `parser-markdown`); botão "Nova prova" que limpa o `localStorage`.
- Persistência de rascunho em `localStorage`: salvo a cada alteração, nunca
  limpo automaticamente.
- Adiciona item(ns) de menu para iniciar/retomar uma prova.

### Feature `parser-markdown`

Parser do contrato de markdown, em TypeScript no frontend, sem biblioteca de
markdown.

- Consome o formato de "Contrato de formato do markdown": cabeçalhos
  `## Questão N (tipo)`, alternativas `a)`–`e)`, afirmações `N. ( ) texto`,
  seção `## Gabarito`.
- Formatação inline: apenas `**negrito**` e `*itálico*`; qualquer outro
  markdown vira texto puro.
- Tratamento de erro (ver "Tratamento de erro de parsing"): quando o markdown
  não bate com o formato, o parser retorna avisos mas ainda entrega o que
  conseguiu interpretar, para o preview renderizar parcialmente e o textarea
  seguir editável.
- Adiciona Vitest como dependência de teste, exclusivamente para cobrir o
  parser.
- Integra o resultado do parser ao passo 4 do wizard (preview real).

### Feature `template-impressao`

Montagem da folha da prova para impressão via navegador.

- Preview em folha A4, alimentado pelo parser (`parser-markdown`).
- Layout de questões em 1 ou 2 colunas (escolha do passo 3).
- Cabeçalho: instituição, escola, disciplina, professor, título, bimestre/
  período, valor total, logo do perfil; linhas em branco para o aluno
  preencher à mão (nome, turma, data, nota).
- Renderização dos tipos suportados: múltipla escolha (a–e) e verdadeiro/falso.
- Gabarito **sempre** impresso como última página, separado por quebra de
  página.
- Impressão via `window.print()` + CSS `@media print`. Sem geração de PDF no
  servidor. O professor usa "Salvar como PDF" da própria caixa de impressão
  se quiser um arquivo.
- Adiciona/ajusta item de menu se necessário.

### Feature `painel-inicial`

Enriquece a tela inicial (`route('dashboard')`, `resources/js/pages/Dashboard.vue`),
hoje só um `Card` com texto placeholder. Sem nova entidade persistida, sem nova
dependência. Quatro blocos:

- **Card de rascunho:** lê `provario:rascunho-prova` do `localStorage` via o
  composable existente `useRascunhoProva`.
    - Com rascunho: mostra matéria, ano, quantidade de questões e passo atual
      (`passoAtual` de 1–4); botões **"Retomar"** (vai para `route('prova.criar')`)
      e **"Nova prova"** (chama `limparRascunho()` com `ConfirmDialog`) — única
      forma de limpar o rascunho, coerente com o princípio de limpeza só por ação
      explícita.
    - Sem rascunho: CTA **"Criar prova"**.
- **Atalhos rápidos:** ações para os fluxos principais — criar prova
  (`prova.criar`), novo perfil (`perfis.create`), gerenciar perfis (`perfis.index`).
- **Resumo de perfis:** lista compacta dos perfis institucionais do professor
  (logo, instituição, escola) com link para o CRUD. Exige que
  `DashboardController` passe a prop `perfis` via `PerfilInstitucionalService::listar`
  (mesmo padrão já usado por `ProvaController`). Estado vazio com CTA para criar
  o primeiro perfil.
- **Guia do fluxo:** passo a passo estático (configurar → gerar prompt → colar
  markdown da I.A. → pré-visualizar/imprimir), com lembrete do contrato de
  formato do markdown. Conteúdo fixo, sem dados.

Notas:

- Introduz os primeiros componentes de "stat/widget" do front (subpasta
  `components/painel/`); não há padrão prévio.
- Não adiciona item de menu (o Dashboard já está no `AppSidebar`).
- Sem novos testes de backend além do ajuste de prop do controller; sem Vitest
  (não toca no parser).

### Campos do cabeçalho da prova

- Instituição, escola, disciplina, professor.
- Título da prova, bimestre/período, valor total.
- Linhas em branco para o aluno preencher à mão: nome, turma, data, nota.
- Um logo institucional (imagem única), vinculado ao perfil institucional
  selecionado/salvo.

### Tipos de questão suportados no MVP

- Múltipla escolha (alternativas a–e).
- Verdadeiro ou falso.
- Fora de escopo no MVP: dissertativa, complete/associação.

### Contrato de formato do markdown

O prompt gerado no Passo 2 deve exigir que a I.A. responda exatamente neste
formato, e o parser deve consumir esse mesmo formato:

- Cada questão começa com um cabeçalho `## Questão N (tipo)`, onde `tipo` é
  `múltipla escolha` ou `verdadeiro ou falso`.
- Questões de múltipla escolha têm alternativas em linhas `a) texto` até
  `e) texto`.
- Questões de verdadeiro ou falso têm afirmações em linhas `N. ( ) texto`.
- Ao final, uma seção `## Gabarito` traz uma linha de resposta por questão,
  na mesma numeração.
- Formatação inline suportada no enunciado: apenas `**negrito**` e
  `*itálico*`. Qualquer outro markdown (tabelas, listas, imagens, código) não
  é interpretado — vira texto puro.

Exemplo completo:

```
## Questão 1 (múltipla escolha)
Qual é a capital do Brasil?

a) São Paulo
b) Rio de Janeiro
c) Brasília
d) Salvador

## Questão 2 (verdadeiro ou falso)
Julgue as afirmações:

1. ( ) O Sol é uma estrela.
2. ( ) A Terra é plana.

## Gabarito
1. c
2. 1-V, 2-F
```

### Tratamento de erro de parsing

Quando o markdown colado não corresponde ao formato esperado (ex.: menos
questões que o pedido, tipo de questão não reconhecido, gabarito incompleto),
o sistema exibe um aviso, mas ainda assim renderiza a pré-visualização com o
que conseguiu interpretar. O textarea de markdown permanece editável para o
professor corrigir manualmente.

## Perguntas em aberto

Nenhuma.

## Histórico de emendas

- 2026-09-01 — Consolidação de `docs/REQUIREMENTS.md` neste arquivo e remoção
  do arquivo redundante. Sem mudança de escopo: apenas mescla do conteúdo de
  requisitos com a decomposição em features.
- 2026-09-09 — Criação retroativa do blueprint (`docs/blueprint/PROJECT.md`,
  `ARCHITECTURE.md`, `DESIGN.md`) a partir desta constituição e do código
  existente. Sem mudança de escopo, princípios ou features.
- 2026-09-09 — Adição da feature `painel-inicial` (prioridade Média, pós-MVP):
  enriquece a tela de dashboard, hoje só placeholder, com card de rascunho,
  atalhos, resumo de perfis e guia do fluxo. Sem nova entidade, sem nova
  dependência, sem novo princípio.
- 2026-09-09 — `painel-inicial` concluída (commit `117b4d7`); todas as sete
  tarefas de `docs/tasks/05-painel-inicial.md` fechadas. Com isso as cinco
  features da constituição estão implementadas. Só atualização de status.
- 2026-09-12 — Renomeação retroativa dos artefatos SDD para o padrão
  `NN-<slug>.md` e numeração da seção "Features" com os IDs estáveis `01`–`05`,
  alinhando o repositório à versão atual das skills. Sem mudança de escopo,
  princípios ou features.
