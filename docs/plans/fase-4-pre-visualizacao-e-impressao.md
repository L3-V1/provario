---
titulo: Provario — Fase 4: Pré-visualização e impressão
data: 2026-10-01
status: implementado
---

# Plano — Provario, Fase 4: Pré-visualização e impressão

## Contexto
As Fases 1 a 3 estão concluídas. Hoje `#/provas/:id` (`src/pages/Prova.tsx`) mostra a prova gerada numa visualização simples, com as fichas "Questões" e "Gabarito", mas imprimir essa tela sai com a interface toda (abas, cabeçalho do Provario, fundo pontilhado) e sem o cabeçalho institucional. A Fase 4 transforma essa tela numa folha pronta para imprimir ou salvar em PDF pela impressão do navegador, sem biblioteca de PDF. A Fase 5 vai pôr a edição de questões nesta mesma tela, então a folha precisa ser um componente que só renderiza a partir de um `Exam`.

Decisões tomadas com o usuário:
- **Tela:** a folha **substitui** a visualização atual em `#/provas/:id`, sem rota nova. Os dados da prova e os botões ficam acima da folha e somem na impressão.
- **Cabeçalho (pendência do roadmap):** fica o padrão proposto. É uma caixa com borda, com a logo à esquerda e, à direita, secretaria, escola e uma linha com professora, disciplina, série e ano letivo. Abaixo vem uma grade com Aluno(a) e Nº, depois Turma, Data e Nota. Pode ser ajustado depois, se aparecer um modelo da professora.
- **Gabarito:** numa página nova, com título, escola, série e turma(s), e uma **tabela compacta** em grade de 5 colunas, onde cada célula traz o número e a letra.
- **Letras:** `a)`, `b)`, `c)`, minúsculas com parêntese, também no gabarito.

## Objetivo e escopo
**Entra:**
- Folha em formato A4 na tela, com cabeçalho institucional, título, questões numeradas com alternativas `a)`–`e)` e o gabarito numa página separada
- CSS de impressão: esconde toda a interface, tira o visual de fichário, fixa `@page` A4, não deixa uma questão se dividir entre páginas e põe o gabarito numa página nova
- Botão "Imprimir / Salvar PDF" que chama `window.print()`, com uma dica curta sobre "Salvar como PDF" e sobre desligar "Cabeçalhos e rodapés"
- `document.title` igual ao título da prova enquanto a tela está aberta, para o PDF já sair com esse nome de arquivo

**Fica de fora:** edição, exclusão e regeração de questões (Fase 5); lista de provas, duplicar e backup (Fase 6); instruções fixas para o aluno, folha de respostas, versões A/B e duas colunas (fora do escopo do roadmap).

## Abordagem técnica e decisões

### Helpers puros em `src/lib/exams.ts`
- `letraAlternativa(i: number): string` devolve `'a'`, `'b'`… e substitui o `letra` duplicado em `Prova.tsx` e o `String.fromCharCode(97 + i)` de `QuestaoView.tsx`.
- `rotuloDificuldade(d)` sai do código inline de `Prova.tsx` (usa `DIFICULDADES`).
- `linhaIdentificacao(prova): string[]` monta os itens não vazios da linha do cabeçalho (`Professora: Ana`, `Ciências`, `7º ano`, `2026`). Fica testável sem DOM e omite campos vazios do snapshot do perfil.

### Componente `src/components/FolhaProva.tsx`
Recebe `{ prova: Exam }` e só renderiza, sem estado. Tem três partes internas no mesmo arquivo:
- **`CabecalhoProva`**: `<header>` com borda `border-2 border-tinta`. A logo do snapshot entra se houver (`img` com `alt="Logo da escola"`, altura fixa, `object-contain`); sem logo, a coluna some, sem placeholder. Ao lado vêm a secretaria, a escola em destaque e `linhaIdentificacao`. Embaixo, a grade de campos para preencher (Aluno(a) + Nº / Turma + Data + Nota), com rótulo e linha de preenchimento (`border-b` ou espaço vazio na célula). Só usa breakpoints `sm:`, porque a largura útil de um A4 na impressão (~700 px CSS) passa de `sm` (640) mas não de `md` (768). Assim a impressão sempre usa o layout largo, e no celular a grade empilha.
- **Título** da prova, centralizado (`font-display`, caixa alta), com `break-after-avoid` para não ficar sozinho no fim da página.
- **Questões**: `<ol>` em que cada `<li>` tem `break-inside-avoid`. Dentro de cada uma vão o enunciado com `{n}.` e uma lista de alternativas no formato `a) texto`, com recuo pendurado (hanging indent) e `wrap-break-word`. O navegador já ignora o `avoid` quando a questão não cabe numa página inteira, que é exatamente a exceção do critério de aceite. O `QuestaoView` (com as letras em caixinha) continua só no `Inicio`.
- **`GabaritoProva`**: uma `<section aria-labelledby>` com `print:break-before-page`. Tem o título "Gabarito — {título}", a linha com escola · série · turma(s) e uma grade `grid-cols-5` de células com borda, cada uma mostrando o número em negrito e a letra (`1 – c`). Na tela, ela aparece como uma segunda folha separada, com um rótulo `print:hidden` "Página do gabarito (sai numa página separada)".

Na tela, a folha é um bloco branco com borda e `shadow-relevo-sm`, padding generoso e largura fluida dentro do `main` (`max-w-3xl`). Na impressão perde borda, sombra e padding (`print:border-0 print:shadow-none print:p-0`). As cores ficam nos tokens existentes (`tinta`, `white`), já que a paleta padrão do Tailwind foi descartada.

### Tela `src/pages/Prova.tsx`
- A estrutura atual de "não encontrada" continua igual.
- Acima da folha, num bloco `print:hidden`: o título da página e a `dl` de detalhes (como hoje), o `Aviso` de sucesso, a barra de ações com **"Imprimir / Salvar PDF"** (`btn-primario`, ícone novo `impressora`, `onClick={() => window.print()}`) e "Gerar outra prova", e uma dica curta em texto: *"Na janela de impressão, escolha 'Salvar como PDF' como destino e desmarque 'Cabeçalhos e rodapés'."*
- Depois vem `<FolhaProva prova={prova} />`, no lugar das duas fichas atuais.
- Um `useEffect` grava `document.title = prova.titulo` e devolve `'Provario'` na desmontagem.

### Impressão global
- **`src/index.css`**: um `@page { size: A4; margin: 15mm 14mm; }` e um bloco `@media print` que deixa o `body` branco e sem `background-image`, reduz um pouco a fonte base (~11.5pt), tira da `.folha` a borda, a sombra e a quadrícula, e zera `--margem-x`.
- **`src/components/Layout.tsx`**: `print:hidden` no link "Pular para o conteúdo", na `nav`, nos furos, no `header`, no `footer` e na barra com a logo da Prefeitura. Paddings e larguras zerados na impressão (`print:p-0`, `print:max-w-none`, `print:block` no flex do contêiner) para a folha ocupar a página toda.

### Ícone
Um `impressora` novo em `src/components/Icone.tsx`, no mesmo traço reto dos outros.

## Arquivos
**Criar:**
- `src/components/FolhaProva.tsx`
- `src/pages/Prova.test.tsx`

**Alterar:**
- `src/lib/exams.ts` e `src/lib/exams.test.ts` (`letraAlternativa`, `rotuloDificuldade`, `linhaIdentificacao`)
- `src/pages/Prova.tsx` (folha, botão de imprimir, dica, `document.title`)
- `src/components/Layout.tsx` (`print:*`), `src/index.css` (`@page` e `@media print`), `src/components/Icone.tsx`
- `src/components/QuestaoView.tsx` (passa a usar `letraAlternativa`)
- `src/pages/NovaProva.test.tsx` (ajuste das expectativas que mudam com o novo markup: texto da questão, letras `e)` e células do gabarito)
- `docs/roadmap-provario.md` no fim (Fase 4 concluída e pendência do cabeçalho resolvida) e uma linha sobre as convenções de impressão no `CLAUDE.md`

**Reutilizar:** `listExams`, `DIFICULDADES`, `EXAMS_KEY` e `DEFAULT_EXAMS` (`src/lib/exams.ts`); `useStoredState`; `Aviso` e `Icone`; os padrões `renderAt`, `semear*` e `mockFetch` de `src/pages/NovaProva.test.tsx`.

## Passos de implementação (em ordem)
1. Helpers em `exams.ts` com testes primeiro. Não depende de nada.
2. `QuestaoView` passa a usar `letraAlternativa`, sem mudança visual. Depende de 1.
3. Ícone `impressora`. Não depende de nada.
4. `FolhaProva.tsx` (cabeçalho, título, questões e gabarito, com as classes `break-*` e `print:*`). Depende de 1.
5. `Prova.tsx`: troca as fichas pela folha e adiciona a barra de ações, a dica e o `document.title`. Depende de 3 e 4.
6. CSS de impressão em `index.css` e `print:*` no `Layout.tsx`. Não depende de nada.
7. `Prova.test.tsx` novo e ajustes em `NovaProva.test.tsx`. Depende de 4 a 6.
8. Verificação: `npm run lint`, `npm test`, `npm run build`, mais a conferência visual e de impressão descrita abaixo.
9. Depois que o usuário conferir, roadmap e `CLAUDE.md` atualizados, plano salvo em `docs/plans/fase-4-pre-visualizacao-e-impressao.md` com o relatório de implementação, e commit.

## Testes e critérios de aceite
**Automatizados (Vitest + Testing Library, com a prova semeada direto em `provario:exams`):**
- `exams`: `letraAlternativa(0..4)` dá `a`–`e`; `linhaIdentificacao` omite professora ou ano letivo vazios; `rotuloDificuldade` de cada valor.
- `Prova.test.tsx`:
  - o cabeçalho mostra logo (pelo `alt`), secretaria, escola, professora, disciplina, série e ano letivo, além dos rótulos Aluno(a), Nº, Turma, Data e Nota; sem logo, não renderiza `img` nem placeholder
  - as questões aparecem numeradas, com alternativas `a)`–`e)`, e cada item tem `break-inside-avoid`
  - o gabarito é uma região "Gabarito" com `print:break-before-page`, células `1 – a`… na ordem certa e a linha com escola, série e turma(s)
  - o botão "Imprimir / Salvar PDF" chama `window.print` (com `vi.spyOn`, já que o jsdom não implementa a função)
  - `document.title` vira o título da prova e volta para "Provario" ao sair da tela
  - a interface fica fora da impressão: `navigation`, o cabeçalho do app, o rodapé, a barra de ações e o aviso têm `print:hidden`, e a folha não tem. Como o jsdom não aplica `@media print`, a verificação real é a manual.
- `NovaProva.test.tsx`: a suíte da Fase 3 continua verde, com as expectativas de markup ajustadas.

**Manuais:**
- Com o Playwright MCP (`browser_emulate_media` em `print`), no dev server com uma prova semeada no `localStorage`, tirar screenshots da folha na impressão para conferir que não há interface nem fundo e que o gabarito vem depois.
- No Chrome real, "Salvar como PDF" com uma prova de 20 questões e 5 alternativas (enunciados longos), conferindo que nenhuma questão é cortada entre páginas, que o gabarito começa numa página nova, que a logo sai nítida e que o nome do arquivo é o título da prova. Repetir com um perfil sem logo e sem secretaria. Conferir também no Firefox.
- Tela de celular (~375 px): folha e cabeçalho sem estouro horizontal.

**Critérios de conclusão (roadmap):**
- O PDF salvo pelo navegador mostra só a prova, sem botões ou menus
- O gabarito começa numa página nova
- Nenhuma questão fica dividida entre duas páginas, salvo quando não couber numa página inteira

## Riscos e pontos em aberto
- **Cabeçalho e rodapé do próprio navegador** (URL, data, nº de página) não podem ser desligados por CSS de forma confiável. A dica na tela orienta a desmarcar a opção. Se ainda incomodar, dá para testar `@page { margin: 0 }` com padding na folha, mas isso tira a margem das páginas do meio, então fica como ajuste só se for preciso.
- **`break-inside: avoid` em `li` dentro de grid ou flex** é ignorado em alguns navegadores. Por isso a lista de questões fica em fluxo de bloco comum (`space-y`), não em flex nem grid.
- **Logo grande ou com proporção estranha**: altura fixa com `object-contain` e largura máxima limitada.
- **Visual do cabeçalho**: é o padrão proposto e será ajustado se a professora mostrar o modelo que já usa. Fica isolado em `CabecalhoProva`.
- **Fonte na impressão**: Atkinson Hyperlegible vem do Google Fonts. Se a impressão for disparada antes de a fonte carregar, cai no fallback do sistema, o que é aceitável.

## Relatório de implementação

**Data:** 2026-10-01
**Abordagem:** combinação de fora para dentro: cenários BDD em `Prova.test.tsx` para a tela e ciclos de TDD para os helpers puros, no Vitest já existente. Nenhuma dependência adicionada.
**Suíte:** 169 de 169 passando (154 antes), lint e build limpos.

| Item | Descrição | Teste(s) | Resultado |
|---|---|---|---|
| P1 | `letraAlternativa(0..4)` dá a–e | `exams.test.ts::letraAlternativa` | ✅ |
| P2 | `rotuloDificuldade` | `exams.test.ts::rotuloDificuldade` | ✅ |
| P3 | `linhaIdentificacao` omite campos vazios | `exams.test.ts::linhaIdentificacao` | ✅ |
| P4 | Cabeçalho completo | `Prova.test.tsx::Dado um perfil completo…` | ✅ |
| P5 | Sem logo, sem `img` nem placeholder | `Prova.test.tsx::Dado um perfil sem logo…` | ✅ |
| P6 | Questões numeradas, a)–e), `break-inside-avoid` | `Prova.test.tsx::Então numera as questões…` | ✅ |
| P7 | Título com `break-after-avoid` | `Prova.test.tsx::Então o título da prova…` | ✅ |
| P8 | Gabarito em página nova, células e linha de identificação | `Prova.test.tsx` (região do gabarito, 2 testes) | ✅ |
| P9 | Botão chama `window.print` | `Prova.test.tsx::Quando clica em "Imprimir…"` | ✅ |
| P10 | Dica de impressão | `Prova.test.tsx::Mostra a dica…` | ✅ |
| P11 | `document.title` | `Prova.test.tsx::document.title vira…` | ✅ |
| P12 | Interface com `print:hidden`, folha sem | `Prova.test.tsx::A interface fica fora da impressão…` | ✅ |
| P13 | Prova não encontrada | `Prova.test.tsx::Dado um id inexistente…` | ✅ |
| P14 | Suíte da Fase 3 verde | `NovaProva.test.tsx` | ✅ |
| P15 | Impressão sem interface nem fundo | Playwright, `emulateMedia: print` a 794 px | ✅ |
| P16 | Celular 375 px sem estouro | Playwright | ✅ |
| P17–P20 | PDF no Chrome/Firefox: quebras de página, logo, nome do arquivo, perfil sem logo | verificação manual | ✅ confirmado pelo usuário |

**Desvios / ajustes:**
- Nenhum desvio de escopo.
- `NovaProva.test.tsx`: nome da região do gabarito passou a regex (`/Gabarito/`, pois o título é "Gabarito — {título}") e os `heading` buscam nível 1, já que o título aparece também na folha.
