---
titulo: Provario — Fase 7: Modo manual e resiliência da IA
data: 2026-10-01
status: implementado
---

# Plano — Provario, Fase 7: Modo manual e resiliência da IA

## Contexto
As Fases 1 a 6 estão concluídas. Hoje, gerar e regerar questões depende só do Gemini, que muitas vezes fica lento ou sobrecarregado. A espera pode passar de vários minutos: cada chamada tem um timeout de 90 s, há duas tentativas no mesmo modelo em caso de 503, um modelo reserva (`gemini-flash-latest`) e uma nova tentativa por formato inválido. Sem a chave, o app não gera nada. A Fase 7 cria o **modo manual**: a professora copia o prompt, cola em qualquer chat de IA e cola a resposta de volta no app, que valida e monta a prova. Além disso, o Gemini passa a **falhar em no máximo cerca de 60 s** e, quando falha, oferece o modo manual.

Decisões tomadas com a usuária:
- **Nova prova:** o modo manual é um **painel na própria página**. "Usar outra IA (copiar e colar)" valida os parâmetros, trava o formulário e abre o painel logo abaixo, e "Voltar aos parâmetros" destrava. Não há rota nova.
- **Regerar:** um botão "Regerar com outra IA" em cada questão abre um **painel dentro do cartão daquela questão**. Funciona sem chave, e o "Desfazer" continua valendo.
- **Links:** ChatGPT, Claude e Gemini em nova aba, ao lado do prompt.
- **Timeout:** **60 s no total**. O modelo principal tem até cerca de 35 s e depois entra o Flash-Lite com o tempo que sobrar.
- **Modelo reserva:** `gemini-3.5-flash-lite`, o Flash-Lite estável mais recente segundo ai.google.dev/gemini-api/docs/models (consultado em 01/10/2026).

## Objetivo e escopo
**Entra:**
- Botão "Usar outra IA (copiar e colar)" sempre visível em Nova prova, ao lado de "Gerar prova". Ele exige um perfil, mas não exige a chave.
- Painel do modo manual com três passos: 1) o prompt (somente leitura) com o botão "Copiar"; 2) os links para os chats; 3) a caixa para colar a resposta e o botão "Montar prova".
- Prompt manual com as mesmas regras pedagógicas e o formato JSON descrito no texto, com exemplo.
- Leitura da resposta colada tolerante na extração (blocos de código, texto antes ou depois, lista solta) e estrita na validação. O validador é o mesmo do Gemini.
- Erro específico ("Esperava 10 questões, mas vieram 8.") que mantém o texto colado.
- Regeração manual de uma questão, com a regra de não repetir as outras questões.
- Prova manual salva com `modelo: 'manual'`.
- Gemini com prazo total de 60 s, o Flash-Lite como reserva e, quando falha, um botão no erro que abre o modo manual com os mesmos parâmetros, já com o prompt pronto.

**Fica de fora:** cancelar uma geração do Gemini em andamento, outros provedores por API, tolerar JSON malformado (vírgula sobrando, aspas curvas), mostrar o `modelo` na interface e salvar o texto colado entre visitas.

## Abordagem técnica e decisões

### `src/lib/examPrompt.ts`: prompt manual
- Refatorar o fim de `buildExamPrompt`/`buildQuestionPrompt` com uma opção interna `{ manual }`. No modo Gemini, a linha "Responda somente com o JSON no formato pedido…" continua igual, porque o formato vai no `responseSchema`. No modo manual, ela é trocada por um bloco `formatoManual(quantidade, alternativas)`:
  - "Responda apenas com um objeto JSON, sem texto antes ou depois e sem bloco de código."
  - A descrição dos campos (`questoes` com exatamente N itens, `enunciado`, `alternativas` com exatamente K textos sem letra e `correta` com a letra A–D ou A–E).
  - Um exemplo com 1 questão e K alternativas de texto genérico, montado com `JSON.stringify(…, null, 2)` e `letras(K)`.
  - Para uma questão só, o objeto é a própria questão, sem `questoes`.
- Exportar `buildManualExamPrompt(p)` e `buildManualQuestionPrompt(p, outras, atual)`. As observações da professora continuam no fim, como hoje.

### `src/lib/examResponse.ts`: validação compartilhada e resposta colada
- Separar o que é envelope do Gemini do que é conteúdo:
  - `parseExamData(dados, params): ParseResult`, com a contagem e o `parseQuestion` de cada item, que é o miolo atual de `parseExamResponse`.
  - `parseQuestionData(dados, alternativas, outras: Question[] = [])`. A checagem de enunciado repetido sai de `gemini.ts` (`normalizar` + `Set`) e vem para cá, com o motivo "A questão nova repete uma que já está na prova."
  - `parseExamResponse` e `parseQuestionResponse` continuam com a mesma assinatura (esta ganha `outras` opcional) e só chamam `extrairDados` + `parse*Data`.
- `extrairJsonColado(texto): { ok: true; dados } | { ok: false; motivo }`:
  1. Vazio → "Cole a resposta do chat de IA."
  2. Se houver um bloco de código, usa o conteúdo do primeiro (com ou sem `json`).
  3. Senão, pega do primeiro `{`/`[` até o último `}`/`]`.
  4. Roda `JSON.parse`. Se falhar → "Não encontrei um JSON válido na resposta. Copie a resposta inteira do chat, do começo ao fim."
- `parsePastedExam(texto, params)`: extrai; se vier uma lista solta, trata como `{ questoes: lista }`; depois chama `parseExamData`.
- `parsePastedQuestion(texto, alternativas, outras)`: extrai; aceita também `{ questoes: [uma] }` ou `[uma]`; depois chama `parseQuestionData`.
- As falhas devolvem `motivo` em pt-BR, e o texto mostrado é o próprio `motivo`.

### `src/lib/gemini.ts`: falhar em até 60 s
- `GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite'`. Constantes `PRAZO_TOTAL_MS = 60_000`, `PRAZO_PRINCIPAL_MS = 35_000`, `PRAZO_MINIMO_MS = 8_000` e `PRAZO_TESTE_MS = 20_000` (para `testConnection`). Saem `TIMEOUT_MS`, `GENERATION_TIMEOUT_MS`, `RETRY_DELAY_MS` e a nova tentativa no mesmo modelo.
- `generateContent(apiKey, body, limite: number /* epoch ms */)`:
  - Principal: timeout `min(PRAZO_PRINCIPAL_MS, restante)`.
  - Passa ao Flash-Lite se a resposta for **503, 429 ou ≥ 500**, ou se der **timeout**, e só se restar pelo menos `PRAZO_MINIMO_MS`. O timeout do Flash-Lite é o tempo restante.
  - Outros erros (400/401/403, rede) voltam na hora.
  - Se a reserva também falhar, vale o erro dela. Um timeout sem tempo para a reserva vira `AbortError` → `timeout`.
- `gerarValidado` calcula `limite = Date.now() + PRAZO_TOTAL_MS` uma vez e repassa. A nova tentativa por formato inválido só acontece se ainda restar `PRAZO_MINIMO_MS`.
- Nova mensagem de timeout: "O Gemini não respondeu a tempo." As páginas complementam com a oferta do modo manual.

### `src/lib/exams.ts`
- `MODELO_MANUAL = 'manual'`.
- `createExam(params, perfil, questoes, modelo, agora, id = crypto.randomUUID()): Exam`, que tira de `NovaProva.gerar` a montagem do objeto e do snapshot do perfil. É puro e testável.

### Componente novo `src/components/ModoManual.tsx`
Ele é só apresentação e guarda o próprio texto colado, por isso o erro não apaga a caixa.
- Props: `{ id, titulo, prompt, rotuloAplicar, onAplicar: (texto) => string | null, onCancelar, rotuloCancelar }`. `onAplicar` devolve a mensagem de erro, ou `null` quando deu certo.
- Passo 1: um `<textarea readOnly>` com o prompt e o botão "Copiar" (`navigator.clipboard.writeText`). Se der certo, aparece `Aviso` "Prompt copiado.". Se falhar, o texto do prompt fica selecionado e aparece "Selecione o texto e copie com Ctrl+C."
- Passo 2: os links `https://chatgpt.com`, `https://claude.ai/new` e `https://gemini.google.com/app`, com `target="_blank" rel="noopener noreferrer"`.
- Passo 3: `CampoTexto` textarea "Resposta da IA", com o erro ligado por `aria-describedby`, o botão de aplicar e o de cancelar.
- O visual segue o padrão `ficha` / `btn` com os tokens do tema, que não tem a paleta padrão do Tailwind. O layout continua utilizável no celular.

### `src/pages/NovaProva.tsx`
- Extrair `validarFormulario(): ExamParams | null` (a validação atual mais o foco no primeiro erro), que serve aos dois botões, e `salvarProva(params, questoes, modelo)` (a gravação atual com `StorageQuotaError`, `exam-defaults` e a navegação).
- Estado `manual: ExamParams | null`. "Usar outra IA (copiar e colar)" fica desabilitado só se não houver perfil ou se estiver gerando. Quando o painel está aberto, o `fieldset` do formulário fica desabilitado e os botões de gerar são escondidos. O painel recebe `buildManualExamPrompt(manual)` e `onAplicar = parsePastedExam(...)` → `salvarProva(manual, questoes, MODELO_MANUAL)`.
- Quando o Gemini falha, o `Aviso` de erro mostra a mensagem e um botão "Usar outra IA (copiar e colar)", que abre o painel com os mesmos `params` (o prompt já sai pronto).
- O aviso de chave ausente passa a dizer que dá para configurar a chave ou usar outra IA. "Gerar prova" continua exigindo a chave.

### `src/components/EditorProva.tsx` + `src/pages/Prova.tsx`
- `EditorProva` ganha as props `onRegerarManual(i)` e `painel?: { indice: number; conteudo: ReactNode }`, renderizado no fim do cartão da questão. O botão secundário "Regerar com outra IA" fica sempre habilitado, inclusive sem chave.
- `Prova` ganha o estado `manualIndice: number | null`. O painel usa `buildManualQuestionPrompt(params, outras, atual)`, calculado a partir do rascunho atual. `onAplicar` usa `parsePastedQuestion(texto, atual.alternativas.length, outras)` e, se der certo, `replaceQuestion`, limpa os erros da questão, `setRegerada({ indice, anterior })` (o Desfazer) e fecha o painel.
- O painel fecha ao excluir uma questão, ao regerar com o Gemini, ao salvar e ao descartar. Salvar continua habilitado com o painel aberto: grava o rascunho como está e fecha o painel, descartando o texto colado que ainda não foi aplicado.
- `erroRegerar` passa a guardar `{ indice, mensagem }`, e o aviso de erro ganha o botão "Regerar com outra IA", que abre o painel daquela questão.
- O aviso "Para regerar questões, configure a chave" passa a dizer: "Para regerar com o Gemini, configure a chave. Você também pode regerar com outra IA (copiar e colar)."
- O `modelo` da prova não muda na regeração, porque ele registra a origem da geração.

## Arquivos
- **Alterar:** `src/lib/examPrompt.ts`, `src/lib/examResponse.ts`, `src/lib/gemini.ts`, `src/lib/exams.ts`, `src/pages/NovaProva.tsx`, `src/pages/Prova.tsx`, `src/components/EditorProva.tsx`, e os testes correspondentes (`examPrompt.test.ts`, `examResponse.test.ts`, `gemini.test.ts`, `exams.test.ts`, `NovaProva.test.tsx`, `Prova.test.tsx`).
- **Criar:** `src/components/ModoManual.tsx` (testado pelas páginas). Se precisar de ícone de link externo, ele entra em `Icone.tsx`.
- **Docs:** `docs/roadmap-provario.md` (Fase 7 → concluída, pendências resolvidas), `CLAUDE.md` (modo manual, `ModoManual`, prazo e reserva do Gemini, `MODELO_MANUAL`), `docs/plans/fase-7-modo-manual-e-resiliencia-da-ia.md` com o relatório de implementação no fim.

## Passos de implementação (em ordem)
1. `examResponse.ts`: separar `parseExamData`/`parseQuestionData` (movendo a checagem de repetição), depois `extrairJsonColado`, `parsePastedExam` e `parsePastedQuestion`, com os testes. Os testes atuais precisam continuar passando.
2. `examPrompt.ts`: o prompt manual e os testes.
3. `gemini.ts`: o prazo total, o Flash-Lite e o uso de `parseQuestionResponse(…, outras)`. Atualizar os testes de 503 e de reserva (depende de 1).
4. `exams.ts`: `MODELO_MANUAL` e `createExam`, com os testes.
5. `ModoManual.tsx`.
6. `NovaProva.tsx` com os testes (depende de 1, 2, 4 e 5).
7. `EditorProva.tsx` + `Prova.tsx` com os testes (depende de 1, 2 e 5).
8. `npm run lint && npm test && npm run build`, conferência manual no `npm run dev` e atualização da documentação.

## Testes e critérios de aceite
- **`examResponse.test.ts`:** JSON puro; bloco ```` ```json ````; bloco sem linguagem; texto antes e depois; lista solta; texto vazio; lixo sem JSON; contagem errada → "Esperava 10 questões, mas vieram 8."; questão sem gabarito → motivo com o número dela; `parsePastedQuestion` recusando enunciado repetido e aceitando `{ questoes: [uma] }`; prefixos "a) " removidos também no colado.
- **`examPrompt.test.ts`:** o prompt manual tem as regras pedagógicas, a quantidade, um exemplo JSON válido com K alternativas e as letras certas; o de questão lista os enunciados existentes; o prompt do Gemini continua sem o exemplo.
- **`gemini.test.ts`** (fake timers e um `fetch` que respeita o `signal`):
  - 503 no principal → Flash-Lite, sem nova tentativa no mesmo modelo.
  - 429 no principal → Flash-Lite.
  - Principal pendurado → abortado aos 35 s, Flash-Lite chamado e falha `timeout` em ≤ 60 s no total.
  - Sem nova tentativa por formato quando falta tempo.
  - 401 não passa para a reserva.
  - `regenerateQuestion` continua recusando enunciado repetido.
- **`exams.test.ts`:** `createExam` com o snapshot do perfil, `modelo` e datas.
- **`NovaProva.test.tsx`:**
  - Sem chave: preencher, "Usar outra IA", o painel mostra o prompt com o conteúdo, "Copiar" chama `navigator.clipboard.writeText` (stub), colar um JSON válido salva a prova com `modelo: 'manual'` e navega até ela.
  - Colar 8 questões quando eram 10 mostra o motivo e mantém o texto.
  - Formulário inválido não abre o painel e foca o campo.
  - Gemini falhando → o erro tem o botão que abre o painel com os mesmos parâmetros.
  - "Voltar aos parâmetros" destrava o formulário.
- **`Prova.test.tsx`:**
  - Sem chave, "Regerar com outra IA" na questão 2 e colar uma questão válida troca só a 2 e atualiza o gabarito na folha depois de salvar.
  - "Desfazer" volta a anterior.
  - Uma questão repetida mostra o erro e mantém o texto.
  - Erro de regeração pelo Gemini oferece o modo manual.
- **Critérios do roadmap:**
  - Gerar uma prova completa sem chave.
  - Uma resposta errada mostra o problema sem perder o texto.
  - A regeração manual troca só uma questão e atualiza o gabarito.
  - O Gemini falha em ≤ ~60 s e oferece o modo manual.
- **Conferência manual:** colar o prompt de verdade no ChatGPT, no Claude e no Gemini web e montar a prova; testar "Copiar" no navegador; simular uma falha com uma chave inválida.

## Riscos e pontos em aberto
- **Chats que fogem do formato:** alguns modelos explicam antes do JSON ou usam aspas curvas. A extração cobre texto ao redor e blocos de código, mas JSON malformado é recusado com uma mensagem clara. Se acontecer com frequência, a saída é afrouxar o parser, não a validação.
- **Prompt longo para colar:** com 20 questões e as observações, o prompt continua pequeno (menos de 3 KB). A resposta colada pode ter cerca de 15 KB, o que um textarea aguenta sem problema.
- **Clipboard:** `navigator.clipboard` exige contexto seguro. O GitHub Pages é HTTPS e o `localhost` conta como seguro. O fallback de selecionar o texto cobre o resto.
- **Prazos:** os valores de 35/60 s são estimativas. Uma prova de 20 questões no Flash-Lite com ~25 s deve caber, mas isso só se confirma em uso real. Os valores ficam em constantes fáceis de ajustar.
- **IDs de modelo:** `gemini-3.5-flash-lite` foi confirmado na documentação em 01/10/2026. Se for desativado, o 404 vira `unknown` com detalhe, e o modo manual continua disponível.

## Relatório de implementação
**Data:** 2026-10-01

**Abordagem:** combinação de fora para dentro: TDD nos módulos puros de `src/lib` (extração e validação, prompt, prazos do Gemini, `createExam`) e cenários BDD (Dado / Quando / Então, no Vitest + Testing Library) nas páginas. Cada teste novo foi visto falhando antes da implementação; os dois testes de prazo foram conferidos também desligando a checagem de tempo.

**Resultado:** 382 testes passando (eram 320, sem falhas pré-existentes), `npm run lint` e `npm run build` limpos. Conferência no Chromium (Playwright): "Copiar" funcionando, prova de 10 questões montada a partir de um bloco ```` ```json ```` com texto ao redor e salva com `modelo: 'manual'`, painel da questão utilizável em 375 px sem rolagem horizontal. O projeto não tem ferramenta de cobertura.

| Item | Descrição (do plano) | Teste(s) | Resultado |
|---|---|---|---|
| P1 | Validação separada do envelope (`parseExamData`/`parseQuestionData`), repetição movida para `examResponse.ts` | `examResponse.test.ts::parseExamData / parseQuestionData`, `parseQuestionResponse::com outras, recusa enunciado repetido` + testes antigos | ✅ passando |
| P2 | Extração tolerante: JSON puro, bloco com e sem `json`, primeiro bloco, texto ao redor, lista solta, vazio, lixo | `examResponse.test.ts::extrairJsonColado` (8) | ✅ passando |
| P3 | "Esperava 10 questões, mas vieram 8." e questão sem gabarito com o número | `parsePastedExam::contagem errada`, `::questão sem gabarito` | ✅ passando |
| P4 | `parsePastedQuestion`: repetida, objeto, `{questoes:[uma]}`, `[uma]`, prefixos | `examResponse.test.ts::parsePastedQuestion` (5), `parsePastedExam::remove prefixos` | ✅ passando |
| P5 | Prompt manual: regras, quantidade, exemplo JSON válido com K alternativas e letras, observações no fim | `examPrompt.test.ts::buildManualExamPrompt` (6) | ✅ passando |
| P6 | Prompt manual de questão: enunciados existentes, exemplo sem `questoes` | `examPrompt.test.ts::buildManualQuestionPrompt` (3) | ✅ passando |
| P7 | Prompt do Gemini continua sem exemplo | `examPrompt.test.ts::prompts do Gemini continuam sem o formato no texto` | ✅ passando |
| P8 | 503 → Flash-Lite, sem nova tentativa no mesmo modelo | `gemini.test.ts::503 no principal → Flash-Lite…`, `::503 persistente…` | ✅ passando |
| P9 | 429 → Flash-Lite | `gemini.test.ts::429 no principal → Flash-Lite…` | ✅ passando |
| P10 | Principal pendurado → abortado aos 35 s, Flash-Lite, `timeout` aos 60 s | `gemini.test.ts::principal pendurado → abortado aos 35 s…` | ✅ passando |
| P11 | Sem nova tentativa por formato sem tempo; 503 sem tempo para a reserva | `gemini.test.ts::sem nova tentativa por formato…`, `::na nova tentativa, um 503…` | ✅ passando |
| P12 | 401 e rede não passam para a reserva | `gemini.test.ts::401 não passa para a reserva`, `::falha de rede…` | ✅ passando |
| P13 | `regenerateQuestion` recusa enunciado repetido | `gemini.test.ts::enunciado igual…`, `::duplicata persistente` | ✅ passando |
| P14 | Reserva `gemini-3.5-flash-lite` e "O Gemini não respondeu a tempo." | `gemini.test.ts::o modelo reserva é o Flash-Lite`, `::timeout → mensagem própria…` | ✅ passando |
| P15 | `createExam` e `MODELO_MANUAL` | `exams.test.ts::createExam` (2) | ✅ passando |
| P16 | Gerar sem chave: prompt, Copiar, colar e salvar como `manual` | `NovaProva.test.tsx::Dado que não há chave, quando usa outra IA…` | ✅ passando |
| P17 | 8 de 10 mostra o motivo e mantém o texto | `NovaProva::Quando cola 8 questões…`, `::texto sem JSON` | ✅ passando |
| P18 | Formulário inválido não abre o painel; sem perfil, botão desabilitado | `NovaProva::Dado formulário inválido…`, `::não há perfil…` | ✅ passando |
| P19 | Falha do Gemini oferece o modo manual com os mesmos parâmetros | `NovaProva::Quando o Gemini falha…` | ✅ passando |
| P20 | Painel trava o formulário; "Voltar aos parâmetros" destrava | `NovaProva::Com o painel aberto…` | ✅ passando |
| P21 | Links em nova aba, fallback do Copiar, aviso de chave, armazenamento cheio | `NovaProva` (4 cenários) | ✅ passando |
| P22 | Regerar sem chave troca só a questão e o gabarito; `modelo` não muda | `Prova.test.tsx::Dado que não há chave, quando regera a questão 2…` | ✅ passando |
| P23 | Desfazer, repetida mantém o texto, nº errado de alternativas | `Prova::"Desfazer"…`, `::questão repetida`, `::nº errado` | ✅ passando |
| P24 | Erro do Gemini na regeração oferece o modo manual; novo aviso de chave | `Prova::Dado erro de regeração pelo Gemini…`, `::o aviso explica as duas formas` | ✅ passando |
| P25 | Painel fecha ao cancelar, excluir, regerar pelo Gemini, salvar e descartar | `Prova` (5 cenários) | ✅ passando |
| P26 | Lint, testes e build | `npm run lint && npm test && npm run build` | ✅ passando |
| P27 | Layout no celular e Copiar no navegador | conferência no Chromium (Playwright) | ✅ conferido |
| P28 | Prompt real no ChatGPT, Claude e Gemini web | verificação manual | ⏳ aguarda a usuária |
| P29 | Falha real com chave inválida | verificação manual | ⏳ aguarda a usuária |
| P30 | `CLAUDE.md` e roadmap atualizados | — | ✅ feito |

**Desvios aprovados:** nenhum de escopo. Detalhes de execução: prop `nivel` no `ModoManual` (h2 na página, h3 no cartão); foco no título do painel ao abrir e no enunciado depois de "Trocar questão"; colar várias questões ao regerar uma mostra "Esperava 1 questão, mas vieram N."; o botão da questão tem o nome acessível "Regerar com outra IA a questão N".

**Riscos observados:** os prazos de 35/60 s são estimativas a confirmar em uso real; um 429 passa para o Flash-Lite, o que só gasta uma chamada se a cota da conta for compartilhada entre os modelos.
