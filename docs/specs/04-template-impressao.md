# Especificação — Feature 4: Template de impressão

**ID:** 04
**Slug:** template-impressao

Deriva de
[../constitution/provario.md](../constitution/provario.md) (feature
`template-impressao`, "Campos do cabeçalho da prova", "Tipos de questão
suportados no MVP") e fecha o fluxo iniciado em
[02-wizard-criacao-prova.md](02-wizard-criacao-prova.md) (Passo 4) e
[03-parser-markdown.md](03-parser-markdown.md) (render das questões). As decisões
abaixo vieram da rodada de perguntas; nada foi inventado.

## 1. Problema

O Passo 4 do wizard hoje mostra um preview fluido de tela (cabeçalho +
questões + gabarito), com um aviso de que "a folha A4 e a impressão chegam na
próxima etapa". Falta: (a) a folha em formato A4 fiel, (b) o botão que dispara
a impressão do navegador, (c) o CSS `@media print` que remove o resto da
aplicação e pagina o gabarito como última página.

## 2. Público

Professores do ensino fundamental, no Passo 4 do wizard, prontos para imprimir
ou salvar a prova em PDF pela própria caixa de impressão do navegador.

## 3. Decisões da entrevista

| Tema                | Decisão                                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estrutura           | **Evoluir `PassoPreview.vue`** no Passo 4. Sem rota nova, sem página nova, sem componente de folha separado. Reaproveita `QuestaoPreview` / `TextoFormatado` / `GabaritoPreview`             |
| Aparência na tela   | **Folha A4 visual sempre**: retângulo branco com proporção A4 (210×297 mm), margens internas e sombra, centralizado. WYSIWYG com a impressão                                                 |
| Quebra de questões  | **Questão nunca quebra** entre páginas nem entre colunas (`break-inside: avoid`). Se não couber, vai inteira para a próxima página/coluna                                                    |
| Chrome na impressão | `@media print` **esconde todo o chrome do app**: sidebar, topbar, `PageHeader`, stepper do wizard, `Message`s de aviso/info e os botões (Voltar / Imprimir / Nova prova). Imprime só a folha |
| Gabarito            | **Sempre** impresso, como **última página**, separado por quebra de página (`break-before: page`)                                                                                            |
| Impressão           | `window.print()` disparado por botão "Imprimir" no Passo 4. Sem geração de PDF no servidor. "Salvar como PDF" é a opção da própria caixa de impressão                                        |
| Layout de colunas   | 1 ou 2 colunas conforme escolha do Passo 3 (`rascunho.layout`), tanto na tela quanto no papel. Cabeçalho e gabarito sempre 1 coluna                                                          |
| Menu                | **Sem mudança.** "Criar prova" já existe na sidebar; a impressão acontece dentro do Passo 4                                                                                                  |
| Backend             | **Nenhuma mudança.** Sem rota, controller, model, migration. Sem mudança em `localStorage` / `useRascunhoProva` / template do prompt / parser                                                |
| Dependências        | **Nenhuma nova.** Só CSS e Vue. Sem lib de PDF, sem lib de markdown (constituição)                                                                                                           |

## 4. Escopo

### 4.1 Dentro

1. **Folha A4 (`PassoPreview.vue` reescrito)**
    - Container externo (não impresso): `Message` info, lista de avisos de
      parsing (`Message` severity `warn`, um item por `AvisoParsing`, some
      quando não há avisos) e o botão "Imprimir".
    - Elemento da folha com classe estável (ex.: `folha-impressao`):
      `width: 210mm; min-height: 297mm; padding: ~15mm; background: white;
margin: 0 auto; box-shadow` na tela.
    - Envolto por um container com `overflow-x: auto` para telas estreitas
      (a folha não encolhe; rola na horizontal).
    - Conteúdo da folha, nesta ordem:
        1. **Cabeçalho** (1 coluna): logo do perfil (`cabecalho.logo_url`,
           quando houver), instituição, escola, disciplina, professor(a),
           título da prova, bimestre/período, valor total. Campos vazios são
           omitidos (comportamento atual).
        2. **Linhas do aluno** (1 coluna): nome, turma, data, nota — linhas em
           branco para preencher à mão (comportamento atual).
        3. **Questões**: container que vira `column-count: 2` quando
           `layout === 2`; senão fluxo simples. Um `QuestaoPreview` por
           questão, cada um com `break-inside: avoid`.
        4. **Gabarito**: bloco com `break-before: page` (nova página no papel;
           na tela pode aparecer com um separador visual). Título "Gabarito" +
           `GabaritoPreview` (uma linha por questão: `1. c` / `2. 1-V, 2-F`).
    - Fallback "Nenhum markdown colado ainda." quando `markdown` vazio — a
      folha ainda renderiza cabeçalho e linhas do aluno.

2. **Botão "Imprimir"**
    - No Passo 4, ao lado (ou no lugar) da navegação. Chama `window.print()`.
    - Sempre habilitado (a folha sempre tem ao menos o cabeçalho).

3. **CSS de impressão** (`@media print`, em folha de estilo global —
   `resources/css/app.css` ou arquivo dedicado importado por ela)
    - `@page { size: A4; margin: 15mm; }`.
    - Esconde todo o chrome: técnica de isolamento
      (`body * { visibility: hidden }` + `.folha-impressao, .folha-impressao *
{ visibility: visible }` + reposiciona a folha em `top:0; left:0;
width:100%`), OU regras explícitas ocultando `aside` (sidebar),
      `AppTopbar`, `PageHeader`, o stepper `<ol>`, os `Message` e os botões.
      Decisão da técnica exata fica para o plano; o resultado observável é:
      **só a folha é impressa**.
    - Na impressão: folha sem `box-shadow`, sem `margin`, sem `min-height`
      fixo (deixa paginar), `padding` controlado pelo `@page`.
    - `break-inside: avoid` nas questões; `break-before: page` no bloco do
      gabarito.

### 4.2 Fora

- Geração de PDF no servidor; endpoint de download.
- Mais de um logo; posição/tamanho configurável do logo.
- Numeração de páginas, rodapé institucional, marca d'água.
- Cabeçalho repetido a cada página impressa.
- Ajuste fino de fontes/kerning para caber X questões por página.
- Tipos de questão além de múltipla escolha e verdadeiro/falso.
- Persistência da prova, histórico, reimpressão a partir de registro salvo.
- Mudança no template do prompt (Passo 2), no parser ou no composable de
  rascunho.
- Testes automatizados de componente Vue (constituição limita o Vitest ao
  parser).
- Item de menu novo.

## 5. Arquivos afetados (previsão — detalhe no plano)

| Arquivo                                             | Mudança                                                         |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `resources/js/components/prova/PassoPreview.vue`    | Reescrito: folha A4 visual, botão "Imprimir", classes de print  |
| `resources/js/components/prova/QuestaoPreview.vue`  | Classe / regra `break-inside: avoid`                            |
| `resources/js/components/prova/GabaritoPreview.vue` | Bloco com `break-before: page` (ou aplicado no `PassoPreview`)  |
| `resources/js/pages/prova/Criar.vue`                | Possível ajuste da barra de ações no Passo 4 (posição do botão) |
| `resources/css/app.css` (ou `print.css` importado)  | Bloco `@media print` + `@page`                                  |

Sem mudança em rotas, `routes/`, `app/`, `database/`, `config/`.

## 6. Critérios de aceite (observáveis)

1. No Passo 4, com markdown válido colado, aparece uma folha branca com
   proporção A4 visível na tela, centralizada, com sombra.
2. O cabeçalho da folha mostra os campos preenchidos do Passo 3 (instituição,
   escola, disciplina, professor, título, bimestre, valor) e o logo do perfil
   quando selecionado; campos vazios não aparecem.
3. A folha mostra as linhas em branco do aluno (nome, turma, data, nota).
4. As questões são renderizadas pelo parser (enunciado com `**negrito**` /
   `*itálico*`, alternativas `a)`–`e)`, afirmações `N. ( )`), em 1 ou 2
   colunas conforme o Passo 3.
5. O gabarito aparece ao final, com uma linha por questão.
6. Há um botão "Imprimir" que abre a caixa de impressão do navegador.
7. Na pré-visualização de impressão do navegador:
   a. não aparecem sidebar, topbar, cabeçalho da página, stepper, avisos nem
   botões — só a folha;
   b. o papel é A4;
   c. nenhuma questão fica partida entre duas páginas ou duas colunas;
   d. o gabarito começa em uma página nova, sozinho (mais páginas se não
   couber).
8. Com o markdown vazio, a folha ainda mostra cabeçalho e linhas do aluno, com
   o texto "Nenhum markdown colado ainda." no lugar das questões, e o botão
   "Imprimir" continua funcionando.
9. Avisos de parsing (`prova.avisos`) continuam listados fora da folha e não
   são impressos.
10. `npm run types:check`, `npm run build` e `composer test` passam sem
    alteração de backend. `npm run test` (parser) permanece verde e inalterado.

## 7. Restrições

- Constituição: sem dependência nova; impressão só via `window.print()` +
  `@media print`; prova não persistida; nomenclatura de domínio em português.
- A folha deve ser fiel entre tela e papel (mesma árvore de componentes; o
  `@media print` só remove chrome e ajusta paginação, não reorganiza o
  conteúdo).
- Nenhum uso de `v-html` (mantém a política do parser).

## 8. Perguntas em aberto

Nenhuma. **Aprovação pendente** desta spec antes de avançar para o plano
(`docs/plans/04-template-impressao.md`).
