# Provario

## Visão geral

Aplicação web para professores do ensino fundamental elaborarem provas com apoio
de I.A.: o sistema gera um prompt para colar num chat de I.A., recebe o retorno
em markdown, monta a prova a partir de um template de impressão e permite salvar
e imprimir. Ver [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

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

## Instruções para o Agente

> Obedeça o seguinte fluxo para conduzir o processo de desenvolvimento do sistema

1. **Entrevista:**
    - **Arquivo**: `docs/features/<slug-do-projeto>.md`
    - Faça perguntas ao usuário até ambos chegarem à um consenso sobre o que será implementado e como será implementado. Quando o escopo for definido, separe a proposta de desenvolvimento em "features".

2. **Especificações:** 
    - **Arquivo:** `docs/specs/<slug-da-feature>.md`
    - Inicie a implementação das features em sequência, começando pela definição das especificações para a mesma. Conduza uma nova rodada de perguntas para esclarecer todos os seus detalhes técnicos.

3. **Planejamento:**
    - **Arquivo:** `docs/plans/<slug-da-feature>.md`
    - Prepare um plano de implementação para a feature atual e continue fazendo perguntas ao usuário caso julgue necessário definir mais algum detalhe.

4. **Tarefas:**
    - **Arquivo:** `docs/tasks/<slug-da-feature>.md`
    - Decomponha o plano de implementação em tarefas objetivas e verificáveis.

5. **Implementação:** 
    - Inicie o ciclo de implementação com base nas tarefas que foram definidas. Siga uma abordagem de TDD com a técnica de RED-GREEN-REFACTOR. Registre o progresso da realização das tarefas no arquivo que foi criado para elas

## Regra de Ouro

- **NÃO** invente requisitos
- **NÃO** tome decisões por conta própria
- **NÃO** amplie o escopo do projeto silenciosamente
- **SEMPRE** faça perguntas quando surgirem dúvidas ou quando forem identificadas lacunas nas instruções do usuário

> Utilize a interface gráfica que estiver diponível no ambiente para fazer perguntas (Ex.: AskUserQuestion). Caso nenhuma esteja disponível, apresente as perguntas em forma de texto no chat, mas mantenha o formato de múltipla escolha. Para cada pergunta ofereça uma opção recomendada

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
