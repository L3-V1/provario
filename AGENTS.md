# Provario

## Visão geral

Aplicação web para professores do ensino fundamental elaborarem provas com apoio
de I.A.: o sistema gera um prompt para colar num chat de I.A., recebe o retorno
em markdown, monta a prova a partir de um template de impressão e permite salvar
e imprimir. Ver [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## Metodologia de Desenvolvimento

Este projeto segue uma metodologia SDD: a **Constituição** estabelece os
princípios que governam o projeto, e cada etapa seguinte (Spec → Plano →
Tarefas → Implementação) deve ser rastreável e coerente com ela. Cada etapa
gera um artefato em disco. **Nunca pular etapas. Nunca avançar sem aprovação
explícita do usuário.**

## Convenção de slug

`<slug>` = kebab-case, sem acentos, derivado do nome do projeto ou da feature.
Ex.: "Login com OAuth" → `login-oauth`.

## Estrutura de diretórios

```
docs/
  constitution/   # etapa 1 — constituição do projeto (por projeto)
  specs/          # etapa 2 — especificação (por feature)
  plans/          # etapa 3 — plano técnico (por feature)
  tasks/          # etapa 4 e 5 — tarefas e progresso (por feature)
```

---

## Etapa 1 — Constituição
**Arquivo:** `docs/constitution/<slug-do-projeto>.md`

Objetivo: estabelecer, via **entrevista** com o usuário, os princípios e
restrições que vão governar todas as decisões futuras do projeto — nunca por
suposição.

Cobrir obrigatoriamente:
- Visão / problema que o projeto resolve
- Usuários-alvo
- Princípios não-negociáveis (ex.: simplicidade > flexibilidade, cobertura
  mínima de testes, sem dependências não justificadas)
- Stack tecnológica e restrições técnicas fixas
- Padrões de qualidade / Definition of Done globais
- Escopo do projeto (dentro / fora)
- **Decomposição do projeto em features** — a Constituição deve quebrar o
  escopo levantado na entrevista em uma lista de features independentes,
  cada uma com seu `<slug-da-feature>`. É essa lista que orienta as etapas
  2 a 5, executadas uma feature por vez.

Template do arquivo:
```markdown
# Constituição: <nome do projeto>

## Visão / Problema
## Usuários-alvo
## Princípios (não-negociáveis)
## Stack e restrições técnicas
## Padrões de qualidade (DoD global)
## Escopo do projeto

## Features do projeto
| Slug | Descrição | Prioridade | Status |
|------|-----------|------------|--------|
| <slug-da-feature> | <resumo em 1 linha> | Alta/Média/Baixa | Pendente |

## Perguntas em aberto
```

A Constituição é a referência para todas as etapas seguintes. Qualquer
especificação, plano ou tarefa que conflite com ela deve ser **sinalizada ao
usuário**, nunca resolvida por conta própria.

A tabela de features é o backlog oficial do projeto: as etapas 2 a 5 sempre
operam sobre uma feature listada ali. Uma feature que surgir depois e não
estava prevista é, por definição, uma mudança de escopo — exige uma emenda
à Constituição (ver abaixo) antes de qualquer spec ser iniciada para ela.
A coluna "Status" deve ser atualizada (`Pendente` → `Em andamento` →
`Concluída`) conforme o ciclo de cada feature avança pelas etapas 2 a 5.

**Emendas:** alterações na Constituição já aprovada exigem aprovação
explícita e devem ser justificadas (registrar data e motivo no próprio
arquivo, em uma seção "Histórico de emendas").

---

## Etapa 2 — Especificação
**Arquivo:** `docs/specs/<slug-da-feature>.md`

Objetivo: definir **o quê** será construído — nunca o como. A feature
tratada aqui precisa constar na tabela "Features do projeto" da Constituição
aprovada; se não constar, tratar como mudança de escopo e voltar à etapa 1
para emendar a Constituição antes de prosseguir. Se a entrevista inicial não
cobrir informação suficiente para esta feature específica, fazer perguntas
adicionais de clarificação antes de escrever a spec.

Conteúdo mínimo:
- User stories / requisitos funcionais
- Requisitos não-funcionais (performance, segurança, etc.)
- Modelos de dados
- Contratos de API / interfaces
- Casos de borda
- Critérios de aceite testáveis

Antes de finalizar: checar se algo entra em conflito com a Constituição; se
sim, perguntar ao usuário como resolver — não decidir sozinho.

---

## Etapa 3 — Plano
**Arquivo:** `docs/plans/<slug-da-feature>.md`

Objetivo: definir **o como** — traduzir a spec aprovada em abordagem técnica,
respeitando a Constituição.

- Arquitetura da solução
- Decisões técnicas (bibliotecas, padrões, trade-offs)
- Dependências entre partes
- Ordem sugerida de implementação

Se houver mais de uma opção técnica razoável, ou se a melhor opção conflitar
com um princípio da Constituição, **apresentar como pergunta ao usuário** —
nunca decidir unilateralmente.

---

## Etapa 4 — Tarefas
**Arquivo:** `docs/tasks/<slug-da-feature>.md`

Objetivo: quebrar o plano aprovado em tarefas pequenas, testáveis, em ordem
de execução, cada uma com Definition of Done (DoD).

Template:
```markdown
# Tarefas: <slug-da-feature>

- [ ] Tarefa 1 — DoD: ...
- [ ] Tarefa 2 — DoD: ...
```

---

## Etapa 5 — Implementação (TDD)

Para cada tarefa, ciclo obrigatório:
1. **Red** — escrever o teste que falha
2. **Green** — implementar o mínimo necessário para passar
3. **Refactor** — limpar mantendo os testes verdes

Após concluir cada tarefa:
- Rodar a suíte de testes
- Marcar `[x]` em `docs/tasks/<slug-da-feature>.md`
- Registrar nota curta se alguma decisão relevante foi tomada durante a implementação

Se durante a implementação surgir necessidade de mudar escopo, requisito, ou
algo conflitar com a Constituição: **PARAR e perguntar** — nunca decidir
sozinho.

---

## Regras gerais (valem para todas as etapas)

- **NÃO** ampliar o escopo silenciosamente
- **NÃO** tomar decisões por conta própria quando houver ambiguidade, mais de
  uma opção válida, ou conflito com a Constituição
- **NÃO** inventar requisitos, dados, nomes de arquivos ou endpoints não
  mencionados
- **SEMPRE** perguntar diante de dúvida ou lacuna nas instruções
- **SEMPRE** aguardar aprovação explícita do usuário antes de avançar de etapa
- **SEMPRE** garantir rastreabilidade: toda decisão em Spec, Plano ou Tarefas
  deve remontar a algo definido na Constituição. Se não remontar, é sinal de
  lacuna — perguntar antes de prosseguir.

## Como fazer perguntas

1. Priorizar a interface gráfica do ambiente para perguntas (ex.: ferramenta
   de pergunta com múltipla escolha), quando disponível.
2. Quando não houver interface disponível, apresentar no chat:
   - Pergunta objetiva + opções rotuladas (A/B/C/D)
   - Sempre indicar uma recomendação, com justificativa breve
   - No máximo 3 perguntas por vez, priorizando as mais bloqueantes
3. Nunca prosseguir com suposição quando a resposta puder mudar o resultado.

## Checklist de transição entre etapas

Antes de avançar para a próxima etapa, confirmar:
- [ ] Artefato da etapa atual foi salvo no caminho correto
- [ ] Conteúdo está em conformidade com a Constituição (a partir da etapa 2)
- [ ] Usuário aprovou explicitamente o conteúdo
- [ ] Não há perguntas em aberto sem resposta

## Stack técnica

- Backend: PHP 8.3, Laravel 13, Inertia 3 (Laravel Vue starter kit)
- Frontend: Vue 3, PrimeVue 4 + `tailwindcss-primeui`, Tailwind 4, TypeScript, Ziggy
- Build: Vite 8 via `vite-plus` (comandos `vp`)
- Pacotes: Composer (PHP), npm (JS)
- Locale padrão: `pt_BR`

## Convenções de código

- Arquitetura backend: Controller → Service → Repository (`app/Http/Controllers`,
  `app/Services`, `app/Repositories`); models em `app/Models`
- Nomenclatura de domínio em português
- Frontend em `resources/js` (`pages`, `components`, `layouts`, `composables`, `types`)
- Lint/format PHP: Pint (preset `laravel`, `pint.json`)
- Análise estática: PHPStan/Larastan nível 7 (`phpstan.neon`)
- Lint/format JS: `vp check`
- `.editorconfig` na raiz

## Documentação adicional

- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) — requisitos do MVP
- [docs/knowledge/INDEX.md](docs/knowledge/INDEX.md) — base de conhecimento (problemas resolvidos)

## Comandos

```bash
composer setup          # instala deps, .env, key, migrate, build
composer dev            # sobe ambiente de desenvolvimento (artisan dev)
composer test           # config:clear + pint --test + phpstan + artisan test
composer lint           # pint --parallel
composer ci:check       # npm run check + types:check + testes
php artisan test        # só testes PHP
npm run dev             # vite dev (vp dev)
npm run build           # build de produção
npm run types:check     # vue-tsc --noEmit
```