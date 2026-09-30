---
titulo: Provario — Fase 2: Perfis institucionais
data: 2026-09-30
status: aprovado
---

# Plano — Provario, Fase 2: Perfis institucionais

## Contexto
A Fase 1 está concluída: o site está no GitHub Pages, com hash routing, layout "fichário", camada `src/lib/storage.ts` + `useStoredState`, `ConfirmDialog`, `Aviso`, `Icone` e testes em Vitest + Testing Library. A Fase 2 permite à professora cadastrar os perfis das escolas onde dá aula (nome do perfil, escola, secretaria/rede, logo, professora, ano letivo). Esses perfis alimentam o formulário de geração (Fase 3), o cabeçalho impresso (Fase 4) e o backup (Fase 6).

Decisões tomadas com o usuário:
- **Rotas próprias:** `#/perfis` (lista), `#/perfis/novo` e `#/perfis/:id` (formulário).
- **Obrigatórios:** só nome do perfil e escola; os demais campos são opcionais.
- **Valores iniciais de um perfil novo:** ano letivo = ano atual; professora = a do perfil editado mais recentemente, se houver.
- **Sem extras:** nada de duplicar perfil nem de perfil padrão.

## Objetivo e escopo
**Entra:**
- Lista de perfis com criar, editar e excluir (a exclusão pede confirmação)
- Formulário com os seis campos, validação com mensagens em pt-BR
- Upload da logo com redimensionamento, pré-visualização e remoção, guardada como data URL no perfil
- Pré-visualização do perfil (mini-cabeçalho com logo, escola, secretaria, professora e ano)
- Persistência em `provario:profiles`
- Aba "Perfis" na navegação

**Fica de fora:** duplicar perfil, perfil padrão, seleção de perfil na prova (Fase 3), layout final do cabeçalho impresso (Fase 4), export/import (Fase 6). A exclusão de perfis já usados em provas fica para a Fase 3: como a prova vai guardar uma cópia dos dados do perfil (snapshot), excluir o perfil não quebra provas antigas.

## Abordagem técnica e decisões
- **Modelo (`src/lib/profiles.ts`):**
  ```ts
  interface Profile { id: string; nome: string; escola: string; secretaria: string;
    logo: string /* data URL ou '' */; professora: string; anoLetivo: string;
    criadoEm: string; atualizadoEm: string /* ISO */ }
  interface ProfilesData { version: 1; perfis: Profile[] }
  ```
  Chave `profiles` (o mesmo padrão de `settings.ts`: `PROFILES_KEY`, `DEFAULT_PROFILES` como constante de módulo, porque o `useStoredState` exige um fallback estável). Uma chave com o array inteiro deixa o export/import da Fase 6 simples. `id` via `crypto.randomUUID()`.
  Funções puras e testáveis: `emptyDraft(perfis)` (ano atual e professora do perfil com `atualizadoEm` mais recente), `validateProfile(draft)` → `{ nome?: string; escola?: string }`, `normalize` (apara espaços), `upsertProfile(data, draft, agora)` e `deleteProfile(data, id)`. Também `getProfiles()` e `getProfile(id)` para uso na Fase 3. A lista é exibida em ordem alfabética (`localeCompare` com `pt-BR`).
- **Logo (`src/lib/logo.ts`):** `processLogo(file): Promise<string>`. Aceita PNG, JPEG e WebP (SVG fica de fora, porque pode conter script e varia na rasterização), com até 5 MB de entrada. Decodifica com `createImageBitmap` e redimensiona num `<canvas>` para no máximo 400 px no lado maior (sem ampliar imagens pequenas). Exporta PNG para preservar a transparência: uma logo de 400 px fica em dezenas de KB, bem abaixo do limite de ~5 MB do localStorage. Erros tipados com mensagem em pt-BR ("Formato não suportado. Use PNG, JPG ou WebP.", "Imagem muito grande (máx. 5 MB).", "Não foi possível ler a imagem."). A parte pura, `fitWithin(w, h, max)`, fica separada para teste, já que o jsdom não tem canvas.
- **Pré-visualização (`src/components/CabecalhoPerfil.tsx`):** bloco com a logo (ou um espaço reservado quando não houver), a escola em destaque, a secretaria, a professora e o ano, no visual `ficha`. Aparece no formulário, atualizando em tempo real, e nos cartões da lista, e serve de base para o cabeçalho da Fase 4. Campos vazios são omitidos.
- **Lista (`src/pages/Perfis.tsx`):** título "Perfis", botão "Novo perfil" (`Link` estilizado como `btn btn-primario`), um cartão por perfil (`CabecalhoPerfil` + nome do perfil + botões "Editar" e "Excluir"). Excluir abre o `ConfirmDialog` ("Excluir o perfil X?"). Estado vazio amigável, com explicação curta e botão "Cadastrar primeiro perfil". O retorno de sucesso ("Perfil salvo." / "Perfil excluído.") aparece num `Aviso`, e o retorno vindo do formulário chega via `navigate('/perfis', { state: { aviso } })`.
- **Formulário (`src/pages/PerfilForm.tsx`):** mesma tela para `novo` e `:id`. Usa `<form noValidate>` com validação própria. Os erros aparecem abaixo do campo, com `aria-invalid` e `aria-describedby` (ex.: "Informe o nome do perfil.", "Informe o nome da escola."), e o foco vai para o primeiro campo inválido. Os obrigatórios são marcados no rótulo. O campo de logo tem o input de arquivo com rótulo, a miniatura, "Trocar logo" e "Remover logo", mais o erro do `processLogo` em `Aviso` de erro. Botões "Salvar perfil" e "Cancelar" (volta para a lista). Se o `writeItem` lançar `StorageQuotaError`, a tela mostra um erro claro e não perde o que foi digitado. Com `:id` inexistente, mostra um `Aviso` de erro com link para a lista.
- **Navegação (`src/components/Layout.tsx`, `src/router.tsx`):** adicionar a aba "Perfis" entre Início e Configurações e as três rotas. O `end` do `NavLink` passa a valer só para `/`, para que a aba "Perfis" continue ativa em `/perfis/novo` e `/perfis/:id`.
- **Ícones (`src/components/Icone.tsx`):** acrescentar `mais`, `lapis` e `imagem`, no mesmo traço dos atuais.
- **Estilo:** só as classes existentes (`ficha`, `ficha-cabecalho`, `campo`, `btn-*`, `link`, `titulo-pagina`) e os tokens do `@theme`, sem cores novas.

## Arquivos
**Criar:**
- `src/lib/profiles.ts`, `src/lib/profiles.test.ts`
- `src/lib/logo.ts`, `src/lib/logo.test.ts`
- `src/components/CabecalhoPerfil.tsx`
- `src/pages/Perfis.tsx`, `src/pages/PerfilForm.tsx`, `src/pages/Perfis.test.tsx`

**Alterar:**
- `src/router.tsx` (rotas), `src/components/Layout.tsx` (aba e `end`), `src/components/Icone.tsx` (ícones)
- `docs/roadmap-provario.md` (Fase 2 → concluída, no fim)

**Reutilizar:** `useStoredState` e `writeItem`/`readItem`/`StorageQuotaError` (`src/lib/storage.ts`), `ConfirmDialog`, `Aviso`, `Icone`, o helper `renderAt` do padrão em `src/pages/Configuracoes.test.tsx`.

## Passos de implementação (em ordem)
1. `profiles.ts` + testes (modelo, defaults, validação, upsert/delete, ordenação). Não depende de nada.
2. `logo.ts` + testes (`fitWithin`, rejeição de tipo e tamanho). Não depende de nada.
3. Ícones novos + `CabecalhoPerfil`. Depende de 1.
4. Rotas e aba "Perfis" (com páginas mínimas). Depende de 1.
5. `Perfis.tsx`: lista, estado vazio, exclusão com confirmação e aviso de retorno. Depende de 3–4.
6. `PerfilForm.tsx`: criar/editar, validação, logo, pré-visualização em tempo real, erro de cota. Depende de 2–5.
7. Testes de comportamento em `Perfis.test.tsx`. Acompanham os passos 5–6.
8. Verificação: `npm run lint`, `npm test`, `npm run build`, mais os testes manuais abaixo. Commit.
9. Marcar a Fase 2 como concluída no roadmap, depois de a professora (ou você) conferir no site publicado.

## Testes e critérios de aceite
**Automatizados (Vitest):**
- `profiles`: `emptyDraft` com ano atual e professora do perfil mais recente (e vazia sem perfis); `validateProfile` exige nome e escola, inclusive quando só há espaços; `upsertProfile` cria com id e datas e atualiza sem duplicar, preservando `criadoEm`; `deleteProfile`; ordenação alfabética pt-BR; `getProfiles` com dado ausente ou corrompido devolve a lista vazia.
- `logo`: `fitWithin` reduz proporcionalmente e não amplia; `processLogo` rejeita SVG/GIF/PDF e arquivos acima de 5 MB com a mensagem certa.
- `Perfis.test.tsx` (com `processLogo` mockado via `vi.mock`):
  - estado vazio com o botão de cadastro
  - cadastrar dois perfis → ambos aparecem → remontar a tela (recarregar) → continuam lá
  - salvar sem nome e escola → mensagens em pt-BR, `aria-invalid` e nada gravado
  - escolher a logo → a miniatura aparece na pré-visualização; "Remover logo" limpa
  - editar um perfil altera só ele
  - excluir: Cancelar e Esc mantêm; confirmar remove e mostra "Perfil excluído."
  - `StorageQuotaError` ao salvar → erro claro, com os dados do formulário mantidos
  - `#/perfis/id-inexistente` → aviso com link para a lista
  - aba "Perfis" ativa em `/perfis/novo`

**Manuais:**
- Upload de logo PNG com transparência, JPG grande e WebP: a pré-visualização fica correta e o tamanho gravado é pequeno (conferir no DevTools → Application → Local Storage).
- Recarregar em `#/perfis/<id>` abre o formulário preenchido.
- Largura de celular (~375 px): lista, formulário e diálogo usáveis, sem estouro horizontal.

**Critérios de conclusão (roadmap):**
- É possível cadastrar mais de um perfil, e todos continuam salvos depois de recarregar a página
- A logo aparece na pré-visualização do perfil
- A exclusão pede confirmação

## Riscos e pontos em aberto
- **Cota do localStorage:** com as logos redimensionadas para 400 px, cabem dezenas de perfis; o `StorageQuotaError` já é tratado na tela. As provas (Fase 3) dividem a mesma cota, e, se isso apertar, a migração para o IndexedDB pode ser avaliada lá.
- **Qualidade da logo na impressão:** 400 px equivale a ~3,4 cm a 300 dpi, suficiente para um cabeçalho. Se a Fase 4 pedir logo maior, o limite fica numa constante.
- **`createImageBitmap` em navegadores antigos:** é suportado em todos os navegadores atuais; se falhar, o fallback é `new Image()` + `URL.createObjectURL`.
- **Exclusão x provas:** depende de a Fase 3 guardar um snapshot do perfil na prova (anotado como premissa para a Fase 3).
