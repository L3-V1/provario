---
titulo: Provario — Fase 5: Revisão e edição de questões
data: 2026-10-01
status: implementado
---

# Plano — Provario, Fase 5: Revisão e edição de questões

## Contexto
As Fases 1 a 4 estão concluídas. `#/provas/:id` (`src/pages/Prova.tsx`) mostra a `FolhaProva` pronta para imprimir, mas a prova gerada é imutável: a IA erra e a professora precisa corrigir antes de imprimir. A Fase 5 adiciona edição de enunciado e alternativas, troca do gabarito, exclusão com renumeração e "Regerar questão" via Gemini. A folha e o gabarito já renderizam a partir do `Exam`, então o que for salvo aparece sozinho na pré-visualização e no PDF.

Decisões tomadas com a usuária:
- **Onde:** modo edição na própria tela `#/provas/:id` (botão "Editar prova"), sem rota nova.
- **Salvamento:** rascunho local + "Salvar alterações" / "Descartar".
- **Regerar:** substitui na hora (no rascunho) e oferece "Desfazer".

## Objetivo e escopo
**Entra:**
- Modo edição com, por questão: textarea do enunciado, input por alternativa, seleção da correta (radio), "Excluir questão" e "Regerar questão"
- Validação ao salvar (enunciado e alternativas não vazios, sem alternativas repetidas, gabarito válido), com mensagens em pt-BR
- Salvar grava `questoes` e `atualizadoEm` na prova; folha e gabarito refletem a mudança
- Excluir renumera (a numeração é o índice, nada a recalcular) e não deixa a prova ficar sem questões
- Regerar pede ao Gemini uma questão nova sobre o mesmo conteúdo, sem repetir as demais; atualiza enunciado, alternativas e gabarito só daquela questão

**Fica de fora:** adicionar questão nova, mudar o número de alternativas, reordenar, edição do cabeçalho/título/perfil da prova (título e perfil são o snapshot; se a professora pedir, fica para a Fase 6), histórico/duplicar (Fase 6), imagens.

## Abordagem técnica e decisões

### Rascunho único para tudo
Ao entrar no modo edição, `Prova.tsx` copia `prova.questoes` para um estado `rascunho`. Editar, excluir e regerar mexem **só no rascunho**; "Salvar alterações" grava de uma vez e "Descartar" (com `ConfirmDialog` se houver mudança) volta ao salvo. Isso evita conflito entre texto digitado ainda não salvo e uma gravação imediata de exclusão/regeração, e mantém o "Desfazer" simples (é só estado local). Trade-off aceito: uma regeração (que gasta cota do Gemini) se perde se ela sair sem salvar; mitigado com `useBlocker` + `ConfirmDialog` quando há alterações pendentes ("Sair sem salvar?").

Fora do modo edição a tela fica como hoje (folha + botão Imprimir). O botão "Imprimir" fica desabilitado no modo edição, para não imprimir um rascunho que não está salvo.

### Helpers puros em `src/lib/exams.ts` (testados em `exams.test.ts`)
- `updateExam(data, exam): ExamsData` — substitui a prova pelo `id` (padrão de `upsert*` de `profiles.ts`), tolerando dado corrompido via `listExams`.
- `validateQuestions(qs): QuestionErrors` — por índice: `enunciado`, `alternativas[j]` (vazia), `repetidas`, `correta`. Reaproveita a regra de duplicata de `examResponse.ts` (comparação com `toLocaleLowerCase('pt-BR')`).
- `normalizeQuestions(qs)` — `trim` em enunciado e alternativas.
- `removeQuestion(qs, i)` (recusa quando sobraria 0), `replaceQuestion(qs, i, q)` e `setCorreta` imutáveis pequenos.
- `questionsEqual(a, b)` para saber se há alteração pendente.

### Regeração (`examPrompt.ts`, `examResponse.ts`, `gemini.ts`)
- `examPrompt.ts`: `buildQuestionPrompt(params, outras: Question[], atual: Question)` reaproveitando as regras pedagógicas de `buildExamPrompt` (extrair as linhas de regras para uma constante compartilhada para não duplicar o texto). Pede **uma** questão, com o número de alternativas da questão atual (`atual.alternativas.length`, não `params.alternativas`), manda "não repita nem reformule" a lista de enunciados das outras questões **e** o da atual, e preserva dificuldade/conteúdo/observações dos `params`. `questionResponseSchema(n)` com o objeto de uma questão (mesmos campos, `correta` como letra).
- `examResponse.ts`: extrair a validação de uma questão do laço de `parseExamResponse` para `parseQuestion(raw, n, alternativas)` (sem mudar comportamento e mensagens) e adicionar `parseQuestionResponse(body, alternativas)` que reusa o tratamento de bloqueio/truncamento/JSON. `parseExamResponse` passa a chamar `parseQuestion`.
- `gemini.ts`: `regenerateQuestion(apiKey, params, outras, atual)` → `{ ok: true, questao, modelo } | GeminiFailure`, com o mesmo fluxo de `generateExam` (chave ausente, uma nova tentativa em resposta fora do formato, `mapResponse`/`mapError`, `GENERATION_TIMEOUT_MS`). Extrair o laço compartilhado em uma função interna para não copiar. Rejeitar também questão idêntica (enunciado igual, ignorando caixa) a alguma outra → trata como `format` e usa a nova tentativa.
- A regeração usa o enunciado/alternativas do **rascunho** (o que a professora vê), não do salvo.

### UI
- `src/components/EditorProva.tsx` (novo): recebe `questoes`, `erros`, `regerando: number | null` e callbacks (`onChange(i, q)`, `onExcluir(i)`, `onRegerar(i)`). Cada questão numa `ficha` com `CampoTexto` (`textarea`) para o enunciado, um campo por alternativa com `radio` "Alternativa correta" (agrupado por `name="correta-i"`, com rótulo acessível `Marcar alternativa b como correta da questão 3`), e botões "Regerar questão" (`Icone faisca`) e "Excluir questão" (`btn-perigo-contorno`, `lixeira`). Excluir pede `ConfirmDialog`; fica desabilitado com uma só questão. Erros de validação inline e foco na primeira questão com erro ao salvar (padrão de `NovaProva.tsx`). Só `sm:` para responsividade, como a folha.
- `Prova.tsx`: estado `modo` (`visualizar` | `editar`), `rascunho`, `erros`, `regerando`, `desfazer: { indice, anterior } | null`, `erroRegerar`. Barra de ações: "Editar prova" (visualizar) / "Salvar alterações" + "Descartar" (editar). Após salvar, volta a `visualizar` com `Aviso` de sucesso "Alterações salvas.". Regerar: desabilita os botões enquanto roda (uma por vez), mostra "Regerando…" com `role="status"`, em sucesso troca a questão no rascunho e mostra `Aviso` "Questão N regerada." com botão "Desfazer"; em falha mostra `Aviso` de erro com `r.message`. A chave vem de `useStoredState(SETTINGS_KEY)`; sem chave, o botão Regerar fica desabilitado com link para Configurações (padrão de `NovaProva`).
- Gravação: `writeItem(EXAMS_KEY, updateExam(readItem(EXAMS_KEY, DEFAULT_EXAMS), {...prova, questoes, atualizadoEm}))` capturando `StorageQuotaError` com a mesma mensagem de armazenamento cheio de `NovaProva` (extrair a string para uma constante em `exams.ts` se ficar duplicada). Reler com `readItem` na hora de gravar, como `NovaProva`, para não pisar em outra aba.
- Se `prova.params.quantidade` ficar diferente do número de questões após excluir, não importa: nenhuma tela usa esse campo depois da geração, e a folha usa `questoes.length`. Registrar no relatório.

## Arquivos
**Criar:** `src/components/EditorProva.tsx`; testes novos em `src/pages/Prova.test.tsx` (já existe, ampliar).
**Alterar:** `src/lib/exams.ts` (+ `exams.test.ts`), `src/lib/examPrompt.ts` (+ `examPrompt.test.ts`), `src/lib/examResponse.ts` (+ `examResponse.test.ts`), `src/lib/gemini.ts` (+ `gemini.test.ts`), `src/pages/Prova.tsx`; no fim `docs/roadmap-provario.md` (Fase 5 concluída), `CLAUDE.md` (uma linha: edição por rascunho e `regenerateQuestion`) e `docs/plans/fase-5-revisao-e-edicao-de-questoes.md` com o relatório.
**Reutilizar:** `listExams`, `EXAMS_KEY`, `DEFAULT_EXAMS`, `letraAlternativa`; `useStoredState`; `readItem`/`writeItem`/`StorageQuotaError`; `ConfirmDialog`, `Aviso`, `CampoTexto`, `Icone`; `generateContent`, `mapResponse`, `mapError`, `letras`; padrões `renderAt`, `semear*` e `mockFetch` de `NovaProva.test.tsx`/`Prova.test.tsx`.

## Passos de implementação (em ordem)
1. Helpers puros em `exams.ts` com testes primeiro (`updateExam`, `validateQuestions`, `normalizeQuestions`, `removeQuestion`, `replaceQuestion`, `setCorreta`, `questionsEqual`). Sem dependências.
2. Refatorar `examResponse.ts` extraindo `parseQuestion` (suíte existente deve continuar verde) e adicionar `parseQuestionResponse`, com testes. Depende de nada.
3. `examPrompt.ts`: `buildQuestionPrompt` e `questionResponseSchema` com testes (contém "não repita", enunciados existentes, número de alternativas certo, observações). Depende de 2 só para o schema.
4. `gemini.ts`: `regenerateQuestion` (laço compartilhado com `generateExam`) com testes de fetch mockado: sucesso, retry em formato inválido, duplicata de enunciado, chave ausente, 429, bloqueio, timeout. Depende de 2 e 3.
5. `EditorProva.tsx`. Depende de 1.
6. `Prova.tsx`: modo edição, rascunho, salvar/descartar, bloqueio de saída, regerar com desfazer, imprimir desabilitado em edição. Depende de 1, 4 e 5.
7. Testes de página (BDD em `Prova.test.tsx`). Depende de 6.
8. Verificação: `npm run lint`, `npm test`, `npm run build`, conferência manual com Playwright e com o Gemini real.
9. Depois da conferência da usuária: roadmap, `CLAUDE.md`, plano salvo com relatório de implementação e commit.

## Testes e critérios de aceite
**Automatizados:**
- `exams`: `validateQuestions` (enunciado vazio, alternativa vazia, duplicata ignorando caixa, `correta` fora do intervalo, questão válida sem erro); `removeQuestion` renumera pela posição e recusa remover a última; `updateExam` troca só a prova certa e tolera dado corrompido; `normalizeQuestions` faz trim.
- `examResponse`/`examPrompt`: `parseQuestion` mantém todas as mensagens atuais (suíte da Fase 3 verde); prefixos "a) " são removidos; o prompt de uma questão cita as outras e a atual e usa o nº de alternativas da questão.
- `gemini.regenerateQuestion`: casos acima, com `fetch` mockado.
- `Prova.test.tsx` (prova semeada em `provario:exams`):
  - "Editar prova" mostra campos preenchidos; "Descartar" não altera o salvo
  - editar enunciado/alternativa e salvar persiste em `provario:exams` (`atualizadoEm` muda) e a folha mostra o novo texto; recarregar (remontar a rota) mantém
  - trocar o radio da correta atualiza a célula do gabarito
  - excluir (com confirmação) renumera: sobram N−1 questões numeradas de 1 e o gabarito idem; com uma questão, o botão fica desabilitado
  - salvar com enunciado vazio ou alternativas repetidas mostra erro inline e não grava
  - regerar chama o `fetch` mockado, troca só aquela questão e o gabarito, mostra "Desfazer", que restaura a anterior; falha da API mostra erro sem mexer na questão; sem chave o botão fica desabilitado
  - sair com alterações pendentes pede confirmação; "Imprimir" desabilitado em edição
- Suítes das Fases 3 e 4 continuam verdes.

**Manuais:** Playwright (desktop e 375 px: editor sem estouro horizontal; `emulateMedia: print` depois de salvar mostra a prova editada); uma regeração com a chave real da usuária, conferindo que a nova questão não repete as outras e que o gabarito muda; PDF no Chrome após editar.

**Critérios de conclusão (roadmap):**
- As edições continuam salvas depois de recarregar a página e aparecem no PDF
- Regerar uma questão troca só aquela questão e atualiza o gabarito
- Excluir uma questão renumera as demais e o gabarito

## Riscos e pontos em aberto
- **Regeração fora do formato ou repetida:** coberta pela nova tentativa automática e pela checagem de enunciado duplicado; se persistir, erro claro e a questão antiga fica intacta.
- **Perda de regeração não salva:** mitigada com bloqueio de navegação; `beforeunload` para fechar a aba fica de fora (pode ser adicionado se incomodar).
- **`useBlocker` exige data router:** o app já usa `createHashRouter` e os testes usam `createMemoryRouter`, então funciona nos dois; confirmar no teste de saída.
- **Cota do localStorage** ao salvar: mesma mensagem e tratamento da Fase 3.
- **Prova gerada em outra aba durante a edição:** a gravação relê o armazenamento e só substitui esta prova, então não perde as outras.
- **Alterar o número de alternativas ou adicionar questão** ficou fora do roadmap; a regeração por substituição cobre o caso comum.

## Relatório de implementação

**Data:** 2026-10-01
**Abordagem:** combinação de fora para dentro: cenários BDD em `Prova.test.tsx` e TDD nos helpers, parser, prompt e `regenerateQuestion`.
**Suíte:** 234 testes passando (169 antes); `oxlint`, `tsc -b` e `npm run build` limpos.

| Item | Descrição | Teste(s) | Resultado |
|---|---|---|---|
| P1–P4 | `updateExam`, `validateQuestions`, `normalizeQuestions`, `removeQuestion`/`replaceQuestion`/`setCorreta`/`questionsEqual` | `exams.test.ts` | ✅ passando |
| P5–P6 | `parseQuestion` sem mudar mensagens; `parseQuestionResponse` | `examResponse.test.ts` | ✅ passando |
| P7 | `buildQuestionPrompt` e `questionResponseSchema` | `examPrompt.test.ts` | ✅ passando |
| P8 | `regenerateQuestion` (sucesso, retry, duplicata, chave, 429, bloqueio, rede, timeout) | `gemini.test.ts` | ✅ passando |
| P9–P18 | Edição, descartar, salvar, gabarito, excluir, validação, armazenamento cheio, bloqueio de saída, regerar/desfazer | `Prova.test.tsx` | ✅ passando |
| P19 | Suítes das Fases 3 e 4 | suíte completa | ✅ passando |
| P20 | Conferência no navegador, regeração real e PDF | verificação manual | ✅ confirmado pelo usuário |

**Desvios / ajustes:**
- Mensagem de armazenamento cheio própria da tela de prova (a da `NovaProva` termina em "gere de novo"), sem constante compartilhada.
- Criados `src/components/idsEditor.ts` e `withQuestions` em `exams.ts` por causa do lint.
- `generateExam` e `regenerateQuestion` compartilham `gerarValidado` em `gemini.ts`.
- Durante a regeração o editor e os botões Salvar/Descartar ficam desabilitados.
- `params.quantidade` pode divergir do número de questões após excluir; nenhuma tela usa esse campo.
