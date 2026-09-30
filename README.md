# Provario

App web estático para gerar provas objetivas de Ciências com o Gemini. Roda inteiro no navegador.

## Desenvolvimento
```bash
npm install
npm run dev      # http://localhost:5173/provario/
npm test         # Vitest
npm run lint
npm run build && npm run preview
```

## Publicação
Push na `main` dispara `.github/workflows/deploy.yml` (lint, testes, build e deploy).
Em *Settings → Pages*, escolha a origem **GitHub Actions**. Se o nome do repositório mudar, ajuste `base` no `vite.config.ts`.

## Chave do Gemini
Criada em https://aistudio.google.com/apikey e colada em **Configurações**; fica só no localStorage do navegador.
