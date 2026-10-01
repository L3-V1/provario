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
  - `exams.ts`: `ExamParams`, `Question` (where `correta` is a 0-based index and letters are presentation only) and `Exam`. An exam stores a **snapshot** of its profile, so editing or deleting the profile doesn't change saved exams. `exam-defaults` remembers some form fields between visits.
  - `examPrompt.ts`: builds the prompt and the Gemini `responseSchema`. The schema asks for the correct answer as a **letter**, which is more reliable for the model.
  - `examResponse.ts`: strictly validates the raw Gemini response (count, alternatives, duplicates, answer key) and strips "a) " or "1. " prefixes. It returns `format`, `blocked` or `truncated` failures.
  - `gemini.ts`: calls the REST API directly with `fetch` and the user's key (no SDK). It has the model constant, a fallback model, a retry on 503, timeouts, and a mapping from HTTP and network errors to `GeminiErrorKind` with pt-BR messages. Functions return discriminated `{ ok: true } | { ok: false, kind, message }` results instead of throwing. `generateExam` retries once on a malformed response.
  - Edição de provas (`Prova.tsx` + `EditorProva`): trabalha num **rascunho** local, salvo de uma vez com `updateExam`/`withQuestions`; `regenerateQuestion` em `gemini.ts` troca uma questão sem repetir as outras.
  - `settings.ts`: the Gemini API key, which lives only in localStorage.
- **Styling**: `src/index.css` defines a custom Tailwind `@theme` that **resets the default palette** (`--color-*: initial`), so only project tokens exist (`tinta`, `santos`, `folha`, `caneta`, …). Standard Tailwind color classes like `bg-gray-100` won't work. The theme is a light-only "fichário" (binder) look with flat neo-brutalist shadows (`shadow-relevo`).
- **Tests**: `src/test-setup.ts` loads jest-dom and clears `localStorage` after each test. Tests seed state by writing `provario:*` keys directly and mock `fetch` for Gemini.

## Planning docs

`docs/roadmap-provario.md` holds the product decisions, out-of-scope items and the six-phase roadmap with per-phase status. `docs/plans/fase-N-*.md` holds the detailed plan for each implemented phase, ending with an implementation report. Read the roadmap before starting a new phase. Printing is meant to use the browser's "Save as PDF" with print CSS, not a PDF library. `FolhaProva` renders the A4 sheet from an `Exam`; app chrome is hidden in print with `print:hidden` (Layout, page action bar) and `@page`/`@media print` live in `src/index.css`.
