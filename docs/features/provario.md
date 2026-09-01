# Features — Provario (MVP)

Decomposição do MVP em features, derivada de [../REQUIREMENTS.md](../REQUIREMENTS.md).
Nada foi inventado além do que consta nos requisitos e na entrevista de escopo.

## Decisões de escopo (entrevista)

- As features 3 (Wizard) e 4 (Template de impressão) permanecem **separadas**,
  apesar do acoplamento entre o preview e o template.
- A ordem de implementação inverte Wizard e Parser: o Wizard é construído antes
  do Parser. O passo 4 do wizard fica com um preview mínimo até a feature 3
  (Parser) entrar.
- Não há menu/navegação global entregue de forma transversal. Cada feature
  adiciona os próprios itens de menu conforme necessário.

## Ordem de implementação

1. Perfis institucionais
2. Wizard de criação de prova
3. Parser de markdown
4. Template de impressão

---

## Feature 1 — Perfis institucionais

**Slug:** `perfis-institucionais`

Única entidade persistida no servidor. CRUD completo, escopado ao professor
logado; um professor pode ter vários perfis.

Referência: REQUIREMENTS seções 2, 7.

- Campos: nome da instituição, nome da escola, nome do professor, logo (upload
  de um único arquivo de imagem por perfil).
- Backend: migration + model `PerfilInstitucional`, arquitetura
  Controller → Service → Repository (repositório concreto, sem interface).
- Frontend: páginas Inertia de listagem, criação, edição e exclusão.
- Armazenamento do logo via storage do Laravel.
- Adiciona item de menu para acesso ao CRUD.

## Feature 2 — Wizard de criação de prova

**Slug:** `wizard-criacao-prova`

Wizard de 4 passos. A prova **não** é persistida no servidor; o estado fica em
localStorage do navegador e só é limpo quando o professor clica em "Nova prova".

Referência: REQUIREMENTS seções 1, 2 (rascunho), 3, 4.

- **Passo 1 — Configuração:** matéria (select fechado, 9 opções), ano (1º a 9º),
  quantidade de questões (numérico).
- **Passo 2 — Prompt:** monta o texto a partir de template fixo com as variáveis
  do passo 1; textarea somente leitura; botão "Copiar prompt"
  (`navigator.clipboard`). O prompt exige o formato markdown estrito da seção 6,
  incluindo gabarito, e deixa a I.A. decidir a mistura entre múltipla escolha e
  verdadeiro/falso.
- **Passo 3 — Conteúdo e cabeçalho:** textarea para colar o markdown da I.A.;
  seleção opcional de perfil institucional salvo que pré-preenche o cabeçalho
  (editar os campos não altera o perfil); campos de cabeçalho (seção 4);
  escolha de layout 1 ou 2 colunas.
- **Passo 4 — Pré-visualização:** preview mínimo nesta feature (parse completo
  chega na feature 3); botão "Nova prova" que limpa o localStorage.
- Persistência de rascunho em localStorage: salvo a cada alteração, nunca
  limpo automaticamente.
- Adiciona item(ns) de menu para iniciar/retomar uma prova.

## Feature 3 — Parser de markdown

**Slug:** `parser-markdown`

Parser do contrato de markdown, implementado em TypeScript no frontend, sem
biblioteca de markdown.

Referência: REQUIREMENTS seções 6, 8; nota técnica seção 10.

- Consome o formato da seção 6: cabeçalhos `## Questão N (tipo)`, alternativas
  `a)`–`e)`, afirmações `N. ( ) texto`, seção `## Gabarito`.
- Formatação inline: apenas `**negrito**` e `*itálico*`; qualquer outro markdown
  vira texto puro.
- Tratamento de erro (seção 8): quando o markdown não bate com o formato, o
  parser retorna avisos mas ainda entrega o que conseguiu interpretar, para o
  preview renderizar parcialmente e o textarea seguir editável.
- Adiciona Vitest como dependência de teste, exclusivamente para cobrir o
  parser.
- Integra o resultado do parser ao passo 4 do wizard (preview real).

## Feature 4 — Template de impressão

**Slug:** `template-impressao`

Montagem da folha da prova para impressão via navegador.

Referência: REQUIREMENTS seções 3 (passo 4), 4, 5.

- Preview em folha A4, alimentado pelo parser (feature 3).
- Layout de questões em 1 ou 2 colunas (escolha do passo 3).
- Cabeçalho: instituição, escola, disciplina, professor, título, bimestre/
  período, valor total, logo do perfil; linhas em branco para o aluno preencher
  à mão (nome, turma, data, nota).
- Renderização dos tipos suportados: múltipla escolha (a–e) e verdadeiro/falso.
- Gabarito **sempre** impresso como última página, separado por quebra de
  página.
- Impressão via `window.print()` + CSS `@media print`. Sem geração de PDF no
  servidor.
- Adiciona/ajusta item de menu se necessário.

---

## Fora do escopo (todas as features)

Conforme REQUIREMENTS seção 9: geração de PDF no servidor; mais de um logo;
formatação além de negrito/itálico; questões dissertativas e de complete/
associação; papéis/permissões; branding institucional; histórico/reabertura/
duplicação de provas.
