---
titulo: Provario — Fase 1: Fundação, deploy e conexão com o Gemini
data: 2026-09-30
status: aprovado
---

# Plano — Provario, Fase 1: Fundação, deploy e conexão com o Gemini

## Contexto
O Provario (roadmap em `docs/roadmap-provario.md`) é um app web estático para uma professora de Ciências gerar provas objetivas com o Gemini. A Fase 1 monta a base do projeto, coloca o site no ar no GitHub Pages e valida o maior risco técnico: chamar o Gemini direto do navegador com a chave da professora. O diretório hoje tem só `docs/roadmap-provario.md` (não é repositório git; `gh` CLI não está instalado; Node 22.14 / npm 10.9).

Decisões já tomadas com o usuário: repositório `provario` no GitHub (base `/provario/`), **localStorage**, **npm**, **Vitest** nas partes de lógica (rodando no CI).

## Objetivo e escopo
**Entra:**
- Projeto Vite + React + TypeScript + Tailwind CSS
- Hash routing e layout base com navegação em pt-BR
- Camada de armazenamento local reutilizável (perfis, provas e backup virão depois)
- Workflow do GitHub Actions: lint + testes + build + deploy no Pages
- Tela **Configurações**: colar/salvar/remover a chave, passo a passo do Google AI Studio, botão **Testar conexão**

**Fica de fora:** perfis, geração de prova, impressão, histórico/backup (Fases 2–6); escolha final do modelo e do prompt de geração (pendência da Fase 3).

## Abordagem técnica e decisões
- **Scaffold:** `npm create vite@latest` com template `react-ts` (traz ESLint). Tailwind **v4** via plugin `@tailwindcss/vite` (`@import "tailwindcss"` no CSS, sem `tailwind.config`). `index.html` com `lang="pt-BR"` e título "Provario".
- **Roteamento:** `react-router` (v7) com `createHashRouter` — o Pages não tem fallback de SPA, e o hash evita 404 ao recarregar. Rotas: `/` (Início) e `/configuracoes`. A navegação mostra só telas que existem; Fases 2+ acrescentam itens ("Perfis", "Nova prova", "Histórico").
- **Vite `base: '/provario/'`** para os assets funcionarem em `usuario.github.io/provario/`.
- **Armazenamento (`src/lib/storage.ts`):** wrapper genérico sobre localStorage com prefixo `provario:`, serialização JSON, `try/catch` em leitura e escrita (modo privado, cota estourada, JSON corrompido → devolve o padrão e não quebra a tela) e erro tipado `StorageQuotaError` na escrita (útil para logos na Fase 2). API: `readItem(key, fallback)`, `writeItem(key, value)`, `removeItem(key)`, `subscribe(key, cb)`. Um hook `useStoredState(key, fallback)` baseado em `useSyncExternalStore` mantém componentes e abas sincronizados (evento `storage` + notificação interna). Cada domínio terá sua chave (`provario:settings` agora; `provario:profiles` e `provario:exams` depois), o que também simplifica o export/import da Fase 6. Os dados guardam um campo `version` para migrações futuras.
- **Configurações (`src/lib/settings.ts`):** tipo `Settings { version: 1; geminiApiKey: string }`, com `getSettings`/`saveSettings` usando a camada acima.
- **Cliente Gemini (`src/lib/gemini.ts`):** `fetch` direto na REST API (`generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent`), sem SDK — bundle menor e controle total do mapeamento de erros; a Fase 3 usa a mesma função com `responseSchema`. A chave vai no header `x-goog-api-key` (não na URL). O modelo fica numa constante `GEMINI_MODEL`, com o Flash estável mais recente confirmado na documentação oficial no momento da implementação. `testConnection(apiKey)` envia um prompt mínimo (ex.: "Responda apenas: OK", `maxOutputTokens` baixo) e devolve `{ ok: true } | { ok: false, kind, message }`. Mapeamento para mensagens em pt-BR:
  - 400 `API_KEY_INVALID` / 401 / 403 → "Chave inválida ou sem permissão. Confira se copiou a chave inteira."
  - 429 → "Limite do plano gratuito atingido. Tente novamente em alguns minutos."
  - 5xx / 503 → "O serviço do Gemini está indisponível no momento."
  - falha de rede (`TypeError` do fetch) → "Sem conexão com a internet ou o Gemini está inacessível."
  - timeout (`AbortController`, ~20 s) → mensagem própria
  - outros → mensagem genérica com o código de status
- **Tela de Configurações (`src/pages/Configuracoes.tsx`):** campo de senha com botão mostrar/ocultar, "Salvar chave" (apara espaços; feedback "Chave salva"), "Remover chave" com confirmação, "Testar conexão" (testa a chave salva; desabilitado sem chave; estado "Testando…"; resultado em `role="status"` para sucesso e `role="alert"` para erro, com cores de contraste adequado). Bloco "Como criar sua chave" com passos curtos e link para `https://aistudio.google.com/apikey`, mais um aviso: a chave fica só neste navegador; não usar em computador compartilhado.
- **Início (`src/pages/Inicio.tsx`):** boas-vindas curtas; se não houver chave, um aviso com link para Configurações.
- **Layout (`src/components/Layout.tsx`):** cabeçalho com nome do app e navegação, conteúdo centralizado com largura máxima, responsivo (funcional no celular).
- **CI/CD (`.github/workflows/deploy.yml`):** gatilho em push na `main` + `workflow_dispatch`; job `build` (checkout, `setup-node` 22 com cache npm, `npm ci`, `npm run lint`, `npm test`, `npm run build`, `actions/upload-pages-artifact` com `dist`); job `deploy` com `actions/deploy-pages`; `permissions: pages: write, id-token: write, contents: read`; `concurrency` para não sobrepor deploys.

## Arquivos a criar
- `package.json`, `vite.config.ts` (base, plugins React + Tailwind, config do Vitest com ambiente `jsdom`), `tsconfig*.json`, `eslint.config.js`, `index.html`, `.gitignore` — vindos do scaffold, ajustados
- `src/main.tsx`, `src/router.tsx`, `src/index.css`
- `src/components/Layout.tsx`
- `src/pages/Inicio.tsx`, `src/pages/Configuracoes.tsx`
- `src/lib/storage.ts`, `src/lib/useStoredState.ts`, `src/lib/settings.ts`, `src/lib/gemini.ts`
- `src/lib/storage.test.ts`, `src/lib/gemini.test.ts`
- `.github/workflows/deploy.yml`
- `README.md` curto (como rodar, testar e publicar)
- Remover os arquivos de demonstração do template (`App.css`, logos, contador)

## Passos de implementação (em ordem)
1. `git init` (branch `main`), scaffold Vite `react-ts`, `npm install`; limpar o demo do template. Commit inicial.
2. Instalar e configurar Tailwind v4 (`tailwindcss`, `@tailwindcss/vite`) e `base: '/provario/'`.
3. Instalar `react-router`; criar `router.tsx` com `createHashRouter`, `Layout` e as páginas vazias. — depende de 1–2
4. Camada de armazenamento + `useStoredState` + `settings.ts`, com testes (Vitest + jsdom). — depende de 1
5. Cliente Gemini (`gemini.ts`) com mapeamento de erros e testes com `fetch` mockado. — depende de 1
6. Tela de Configurações e aviso na Início, ligando 3, 4 e 5.
7. Workflow do GitHub Actions + scripts `lint`, `test` (`vitest run`) e `build` no `package.json`.
8. Verificação local (seção abaixo) e commit.
9. Publicação — **ação do usuário**, já que o `gh` não está instalado: criar o repo público `provario` no GitHub e, em *Settings → Pages*, escolher a origem **GitHub Actions**. Depois eu adiciono o `remote` e faço o `push` da `main` (com a sua confirmação), e acompanhamos o workflow.
10. Com os critérios atendidos, marcar a Fase 1 como concluída em `docs/roadmap-provario.md`.

## Testes e critérios de aceite
**Automatizados (Vitest):**
- `storage`: grava e lê; devolve o padrão com chave ausente ou JSON corrompido; `removeItem`; `StorageQuotaError` quando `setItem` lança `QuotaExceededError`; `subscribe` é notificado na escrita.
- `gemini`: com `fetch` mockado — sucesso; 400 `API_KEY_INVALID`; 403; 429; 503; falha de rede; timeout. Confere se a chave vai no header e não na URL.

**Manuais:**
- `npm run dev` → abre em `/provario/`; a navegação funciona; recarregar em `#/configuracoes` não dá 404.
- Salvar a chave → recarregar → a chave continua lá.
- "Testar conexão" com chave válida → sucesso; com chave inventada → mensagem clara de chave inválida; offline (DevTools) → mensagem de rede.
- `npm run build && npm run preview` → o build de produção funciona com a base `/provario/`.
- Layout usável em largura de celular (DevTools, ~375 px).

**Critérios de conclusão (roadmap):**
- O site abre pela URL do GitHub Pages
- A chave salva continua lá depois de recarregar a página
- "Testar conexão" retorna sucesso com uma chave válida e mostra uma mensagem clara com uma chave inválida

## Riscos e pontos em aberto
- **Nome do modelo do Gemini:** os modelos mudam com frequência; confirmar o id atual na documentação ao implementar. Isolado numa constante, a troca é trivial.
- **CORS / chamada pelo navegador:** a REST API do Gemini aceita chamadas do browser com chave de API; se algo bloquear, é exatamente o risco que esta fase quer revelar cedo.
- **Chave no localStorage:** fica exposta a quem usar o mesmo navegador e a qualquer script da página. Aceitável no MVP (sem dependências de terceiros em runtime, sem backend); a tela avisa isso.
- **Limite de ~5 MB do localStorage:** irrelevante agora; na Fase 2 a logo deve ser redimensionada/comprimida no upload. A camada já sinaliza cota estourada.
- **Publicação depende de você:** criar o repositório e ativar o Pages com origem "GitHub Actions" (passo 9). Se o nome do repo mudar, basta ajustar o `base` no `vite.config.ts`.
