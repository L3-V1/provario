# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Provario is a static, browser-only web app (no backend) that generates multiple-choice Science exams for a public-school teacher in Santos using Google Gemini. It's built with Vite, React 19, TypeScript, Tailwind v4 and React Router 7, and deployed to GitHub Pages. The UI, the code identifiers and the docs are all in **Brazilian Portuguese** (`questoes`, `perfis`, `criadoEm`, …). Keep new code and user-facing text in pt-BR.

## Commands

```bash
npm run dev                               # http://localhost:5173/provario/
npm test                                  # vitest run (jsdom)
npx vitest run src/lib/exams.test.ts      # single file
npx vitest run -t "nome do teste"         # filter by test name
npm run lint                              # oxlint
npm run build                             # tsc -b && vite build
```

A push to `main` runs `.github/workflows/deploy.yml`, which lints, tests, builds and deploys to Pages, so lint and tests must pass. `base: '/provario/'` in `vite.config.ts` must match the repository name.

## Architecture

- **Routing**: `src/router.tsx` exports both `routes` and a `createHashRouter` instance. It uses hash routing because GitHub Pages has no SPA fallback. Page tests render the real `routes` through `createMemoryRouter` at a given path (see `src/pages/NovaProva.test.tsx`).
- **Persistence**: `src/lib/storage.ts` wraps `localStorage` with a `provario:` key prefix, JSON (de)serialization, an in-memory pub/sub plus the cross-tab `storage` event, and `StorageQuotaError` (logos are stored as base64 data URLs, so the quota is a real concern). `src/lib/useStoredState.ts` builds on it with `useSyncExternalStore`, and the `fallback` passed to it must be a stable module-level constant.
- **Domain modules** (`src/lib/`): each stored collection is a versioned envelope (`{ version: 1, perfis: [...] }`, `{ version: 1, provas: [...] }`, settings) with a `*_KEY` and a `DEFAULT_*` constant. They also hold pure helpers (`list*`, `upsert*`, `validate*`, `normalize*`). The `list*` functions accept `unknown` and tolerate missing or corrupt data. Keep logic in these pure functions and test it there, with pages only wiring state.
  - `profiles.ts`: institutional profiles (school, teacher, logo).
  - `exams.ts`: `ExamParams`, `Question` (where `correta` is a 0-based index and letters are presentation only) and `Exam`. An exam stores a **snapshot** of its profile, so editing or deleting the profile doesn't change saved exams. `exam-defaults` remembers some form fields between visits. `createExam` builds a new exam with the snapshot; `MODELO_MANUAL` (`'manual'`) is the `modelo` of exams built from a pasted response.
  - `examPrompt.ts`: builds the prompt and the Gemini `responseSchema`. The schema asks for the correct answer as a **letter**, which is more reliable for the model. `buildManualExamPrompt`/`buildManualQuestionPrompt` are the copy-and-paste versions: same rules, with the JSON format and an example written in the text instead of the schema.
  - `examResponse.ts`: strictly validates the raw Gemini response (count, alternatives, duplicates, answer key) and strips "a) " or "1. " prefixes. It returns `format`, `blocked` or `truncated` failures. `parseExamData`/`parseQuestionData` hold the content validation (the latter also refuses a statement that repeats one of `outras`) and are shared by the Gemini path and the pasted path: `extrairJsonColado` is lenient in extraction (code block, text around it, loose list) and `parsePastedExam`/`parsePastedQuestion` stay strict in validation.
  - `gemini.ts`: calls the REST API directly with `fetch` and the user's key (no SDK). It has the model constant and the fallback model (Flash-Lite), a **60 s total budget** (`PRAZO_TOTAL_MS`; the main model gets up to `PRAZO_PRINCIPAL_MS`, and on 429/5xx/timeout the fallback gets what's left if at least `PRAZO_MINIMO_MS` remains), and a mapping from HTTP and network errors to `GeminiErrorKind` with pt-BR messages. Functions return discriminated `{ ok: true } | { ok: false, kind, message }` results instead of throwing. `generateExam` retries once on a malformed response, only if there's time left.
  - Edição de provas (`Prova.tsx` + `EditorProva`): trabalha num **rascunho** local (título + questões), salvo de uma vez com `updateExam`/`withEdits`; `regenerateQuestion` em `gemini.ts` troca uma questão sem repetir as outras.
  - Modo manual (`components/ModoManual.tsx`): painel de copiar o prompt, abrir ChatGPT/Claude/Gemini e colar a resposta; guarda o texto colado e mostra o erro devolvido por `onAplicar` sem apagá-lo. Em `NovaProva` abre abaixo do formulário (que fica travado) por "Usar outra IA (copiar e colar)", que não exige chave, e também pelo aviso de erro do Gemini. Em `Prova` abre dentro do cartão da questão por "Regerar com outra IA" (o "Desfazer" vale igual).
  - Histórico (`pages/Provas.tsx`, rota `#/provas`): lista as provas da mais recente para a mais antiga (`sortExams`) com abrir, duplicar (`duplicateExam`, cópia independente com id novo) e excluir (`deleteExam`). A aba "Provas" do `Layout` também acende em `/provas/nova` e `/provas/:id`.
  - `backup.ts`: backup em arquivo JSON (`{ app: 'provario', version: 1, perfis, provas }`). `parseBackup` valida tudo e recusa o arquivo inteiro se um item for inválido; `applyBackup` (`substituir` ou `mesclar` por `id`, vence o `atualizadoEm` maior) é puro; `restoreData` grava perfis e provas e reverte os perfis se as provas estourarem a cota. A seção "Backup dos dados" fica em `Configuracoes.tsx`. A chave do Gemini e `exam-defaults` não entram no arquivo.
  - `settings.ts`: the Gemini API key, which lives only in localStorage.
- **Styling**: `src/index.css` defines a custom Tailwind `@theme` that **resets the default palette** (`--color-*: initial`), so only project tokens exist (`tinta`, `santos`, `folha`, `caneta`, …). Standard Tailwind color classes like `bg-gray-100` won't work. The theme is a light-only "fichário" (binder) look with flat neo-brutalist shadows (`shadow-relevo`).
- **Tests**: `src/test-setup.ts` loads jest-dom and clears `localStorage` after each test. Tests seed state by writing `provario:*` keys directly and mock `fetch` for Gemini.

## Planning docs

`docs/roadmap-provario.md` holds the product decisions, out-of-scope items and the six-phase roadmap with per-phase status. `docs/plans/fase-N-*.md` holds the detailed plan for each implemented phase, ending with an implementation report. Read the roadmap before starting a new phase. Printing is meant to use the browser's "Save as PDF" with print CSS, not a PDF library. `FolhaProva` renders the A4 sheet from an `Exam`; app chrome is hidden in print with `print:hidden` (Layout, page action bar) and `@page`/`@media print` live in `src/index.css`.
