# Projeto: Provario

> Descrição completa do projeto — Etapa 1 do blueprint. Alimenta a fase de
> constituição, que confirma escopo, princípios e a decomposição final em features.
> O slug do projeto só é definido na constituição.
>
> **Nota:** este blueprint foi criado retroativamente, a partir da constituição já
> aprovada (`docs/constitution/provario.md`) e do código existente. Todas as
> decisões abaixo já haviam sido respondidas pelo usuário na entrevista de
> constituição; nada foi inventado nem re-perguntado.

## Resumo

Aplicação web para professores do ensino fundamental elaborarem provas com apoio
de I.A. O sistema gera um prompt pronto para colar em um chat de I.A., recebe de
volta o conteúdo em markdown, monta uma pré-visualização em folha A4 com gabarito
e permite salvar/imprimir pelo próprio navegador. A prova não é persistida no
servidor.

## Problema e público-alvo

Professores do ensino fundamental gastam tempo diagramando provas e formatando
gabaritos manualmente. O Provario padroniza esse fluxo: coleta as variáveis da
prova, terceiriza a geração das questões para uma I.A. externa via prompt
copiável, e cuida da montagem visual e da impressão. Público-alvo: professores do
ensino fundamental. Sem papéis nem permissões — todo usuário autenticado é
professor.

## Papéis e atores

- **Professor** (único ator) — autentica-se pelo cadastro público já existente no
  starter kit, gerencia seus perfis institucionais e cria provas.
- **I.A. externa** (fora do sistema) — recebe o prompt copiado pelo professor e
  devolve o markdown; o Provario não integra API de I.A.

## Escopo

### Dentro desta versão

- CRUD de perfis institucionais (única entidade persistida no servidor).
- Wizard de 4 passos para montar a prova (configuração, prompt, conteúdo +
  cabeçalho, pré-visualização).
- Rascunho do wizard em `localStorage`, limpo apenas ao clicar em "Nova prova".
- Parser TypeScript do contrato de markdown, no frontend, sem lib de markdown.
- Template de impressão A4 com gabarito sempre na última página.
- Tipos de questão: múltipla escolha (a–e) e verdadeiro ou falso.
- Impressão via `window.print()` + CSS `@media print`.
- Tema claro/escuro (Aura padrão do PrimeVue, sem identidade institucional).

### Fora desta versão

- Geração de PDF no servidor.
- Persistência da prova no servidor; histórico, reabertura ou duplicação.
- Mais de um logo no cabeçalho.
- Formatação além de `**negrito**`/`*itálico*` no enunciado.
- Questões dissertativas e de complete/associação.
- Papéis/permissões de usuário.
- Identidade visual institucional/branding.
- Integração direta com API de I.A.

## Requisitos funcionais

- Autenticação de professor reaproveitando o cadastro público do starter kit.
- Um professor pode ter vários perfis institucionais (ex.: mais de uma escola);
  cada perfil tem instituição, escola, professor e um logo (upload único).
- Passo 1: seleção de matéria (9 opções fechadas), ano (1º–9º), quantidade de
  questões (numérico).
- Passo 2: prompt montado a partir de template fixo + variáveis do passo 1;
  textarea somente leitura; botão "Copiar prompt". O prompt exige o formato
  markdown estrito (incluindo gabarito) e deixa a I.A. decidir a mistura entre
  múltipla escolha e verdadeiro/falso.
- Passo 3: textarea para colar o markdown; seleção opcional de perfil salvo que
  pré-preenche o cabeçalho (editar os campos não altera o perfil); campos de
  cabeçalho; escolha de layout de 1 ou 2 colunas.
- Passo 4: pré-visualização real alimentada pelo parser; botão "Nova prova" que
  limpa o `localStorage`.
- Parser: consome cabeçalhos `## Questão N (tipo)`, alternativas `a)`–`e)`,
  afirmações `N. ( ) texto` e seção `## Gabarito`; formatação inline apenas
  negrito/itálico; em erro de formato, emite avisos mas ainda entrega o que
  conseguiu interpretar (render parcial, textarea editável).
- Template A4: cabeçalho (instituição, escola, disciplina, professor, título,
  bimestre/período, valor total, logo) + linhas em branco para o aluno (nome,
  turma, data, nota); questões em 1 ou 2 colunas; gabarito sempre como última
  página, separado por quebra de página.

## Requisitos não funcionais

- Simplicidade acima de flexibilidade; nenhuma dependência nova sem justificativa
  (em especial: sem lib de markdown, sem lib/serviço de PDF).
- Locale padrão `pt_BR`; nomenclatura de domínio em português.
- Qualidade: Pint (preset `laravel`), PHPStan/Larastan nível 7, `vp check`,
  `vue-tsc`. Implementação em ciclo TDD; suíte verde antes de concluir tarefa.
- O parser de markdown tem cobertura de teste dedicada em Vitest.
- Sem requisitos de escala relevantes: uso individual por professor, uma prova
  por vez no navegador.

## Critérios de sucesso

- Um professor consegue, em uma sessão, ir da configuração à prova impressa (ou
  "Salvar como PDF" do navegador) sem editar HTML/CSS.
- O gabarito sai sempre correto e sempre na última página.
- O markdown de uma I.A. no formato do contrato renderiza sem ajuste manual;
  markdown fora do formato ainda produz preview parcial utilizável.
- Nenhuma dependência de markdown ou de PDF no `package.json`/`composer.json`.

## Riscos e casos de borda conhecidos

- I.A. externa devolve markdown fora do contrato — mitigado pelo parser tolerante
  a erro e pelo textarea editável.
- Rascunho em `localStorage` perdido se o professor limpar o navegador — aceito;
  a prova não é persistida por decisão de escopo.
- Quebras de página do navegador podem cortar questões — mitigado por
  `break-inside: avoid` na classe `.folha-questao`.
- Impressão depende do navegador do professor; margens/escala variam entre
  navegadores.
- Logo com proporção extrema pode distorcer o cabeçalho — `object-contain` +
  tamanho fixo.

## Decomposição preliminar em features

> Confirmada na constituição. Todas concluídas.

- **`perfis-institucionais`** — CRUD de perfis institucionais (única entidade
  persistida); backend Controller → Service → Repository; upload de logo via
  storage do Laravel.
- **`wizard-criacao-prova`** — wizard de 4 passos; rascunho em `localStorage`;
  preview mínimo até o parser entrar.
- **`parser-markdown`** — parser TypeScript do contrato de markdown, com Vitest;
  integra ao passo 4 do wizard.
- **`template-impressao`** — folha A4 para impressão via navegador, alimentada
  pelo parser; gabarito sempre na última página.
