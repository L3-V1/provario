---
titulo: Provario — Fase 3: Geração da prova
data: 2026-10-01
status: implementado
---

# Plano — Provario, Fase 3: Geração da prova

## Contexto
As Fases 1 e 2 estão concluídas: site no GitHub Pages com hash routing, `src/lib/storage.ts` + `useStoredState`, cliente REST do Gemini em `src/lib/gemini.ts` (`generateContent` com retry em 503 e modelo reserva, `gemini-3.8-flash` → `gemini-flash-latest`), e perfis em `src/lib/profiles.ts`. A Fase 3 entrega o coração do app: a professora preenche os parâmetros, o Gemini devolve questões + gabarito em JSON estruturado, o app valida, salva no navegador e mostra a prova numa visualização simples. A Fase 4 (impressão), a 5 (edição) e a 6 (histórico/backup) dependem do modelo de dados definido aqui.

Decisões tomadas com o usuário:
- **Navegação:** aba "Nova prova" entre Início e Perfis. `#/provas/nova` (formulário) → ao gerar, `#/provas/:id` (visualização). A Fase 6 acrescenta a lista em `#/provas`.
- **Resposta fora do esperado** (JSON inválido, nº errado de questões/alternativas, gabarito ausente): **uma nova tentativa automática**, depois erro claro; nada é salvo.
- **Lembrar parâmetros:** perfil, disciplina, série, turma(s), quantidade, alternativas e dificuldade voltam preenchidos; conteúdo, título e observações começam vazios.
- **Prompt:** padrão sugerido (linguagem adequada à série, contexto do cotidiano, distratores plausíveis, uma única correta, sem "todas/nenhuma das anteriores", gabarito distribuído entre as letras, nada que dependa de imagem). Sem justificativa no gabarito.
- **Modelo (pendência do roadmap):** mantém o `gemini-3.8-flash` com reserva `gemini-flash-latest` já usados na Fase 1 — conferir de novo na documentação ao implementar.

## Objetivo e escopo
**Entra:**
- Formulário de parâmetros com validação em pt-BR
- Prompt + `responseSchema` (saída estruturada) e validação estrita da resposta
- Estados de carregamento e de erro (chave ausente/inválida, limite gratuito, sobrecarga, rede, timeout, conteúdo bloqueado, resposta fora do formato)
- Prova salva no `localStorage` assim que chega, com snapshot do perfil
- Visualização simples (questões numeradas, alternativas com letras, gabarito)

**Fica de fora:** layout de folha, cabeçalho impresso e CSS de impressão (Fase 4); editar/excluir/regerar questão (Fase 5); lista de provas, duplicar, excluir prova e backup (Fase 6).

## Abordagem técnica e decisões

### Modelo de dados — `src/lib/exams.ts`
```ts
type Dificuldade = 'facil' | 'media' | 'dificil' | 'mista'
interface ExamParams {
  perfilId: string; disciplina: string; serie: '6º ano' | '7º ano' | '8º ano' | '9º ano';
  turmas: string; conteudo: string; quantidade: number /* 1–20 */;
  alternativas: 4 | 5; dificuldade: Dificuldade; titulo: string; observacoes: string
}
interface Question { enunciado: string; alternativas: string[]; correta: number /* índice 0-based */ }
interface Exam {
  id: string; titulo: string; params: ExamParams;
  perfil: Omit<Profile, 'criadoEm' | 'atualizadoEm'>  // snapshot: excluir/editar o perfil não altera a prova
  questoes: Question[]; modelo: string; criadoEm: string; atualizadoEm: string
}
interface ExamsData { version: 1; provas: Exam[] }
```
- Mesmo padrão de `profiles.ts`: `EXAMS_KEY = 'exams'`, `DEFAULT_EXAMS` constante de módulo, `listExams(data)` tolerante a dado corrompido, `getExam(id)`, `addExam(data, exam)`. Uma chave com o array inteiro mantém o export/import da Fase 6 simples.
- `correta` como índice (as letras são só apresentação; a Fase 5 troca o gabarito mexendo num número).
- Parâmetros lembrados em `EXAM_DEFAULTS_KEY = 'exam-defaults'` (só os campos combinados). `initialParams(perfis, lembrados)` monta o rascunho: Ciências, 10 questões, 4 alternativas, média, e o perfil lembrado se ainda existir — senão o primeiro em ordem alfabética.
- `validateParams(p)` → erros por campo: perfil obrigatório e existente, conteúdo obrigatório, quantidade inteira 1–20, disciplina não vazia. Título opcional: se vazio, `Avaliação de {disciplina} — {série}`.
- `normalizeParams` apara espaços.

### Prompt e schema — `src/lib/examPrompt.ts`
- `buildExamPrompt(params): string` em pt-BR: papel ("professor(a) experiente de {disciplina} do Ensino Fundamental II da rede pública"), série, conteúdo, quantidade exata, nº exato de alternativas, dificuldade (para "mista": aproximadamente um terço de cada nível), regras pedagógicas acordadas, observações da professora delimitadas como texto do usuário (`"""…"""`) e a instrução de não incluir letras/numeração nos textos.
- `examResponseSchema(params)`: schema OpenAPI do Gemini — `{ questoes: [{ enunciado: string, alternativas: string[], correta: enum ['A'..'D'|'E'] }] }` com `minItems/maxItems` nas listas. A letra na saída é mais confiável para o modelo do que índice; o parser converte para índice.
- Funções puras, testáveis sem rede.

### Validação da resposta — `src/lib/examResponse.ts`
`parseExamResponse(body, params): { ok: true; questoes } | { ok: false; motivo }`:
- Junta o texto de `candidates[0].content.parts` (ignorando partes `thought`), `JSON.parse`.
- Exige exatamente `quantidade` questões, cada uma com enunciado não vazio, exatamente `alternativas` itens não vazios e distintos, e `correta` dentro das letras válidas.
- Remove prefixos como "a) " / "1. " que o modelo às vezes insere; apara espaços.
- Detecta `promptFeedback.blockReason` / `finishReason: 'SAFETY'` (bloqueio) e `'MAX_TOKENS'` (resposta cortada) como motivos distintos.

### Cliente Gemini — `src/lib/gemini.ts` (alterar)
- Extrair o `try/catch` de `testConnection` (AbortError → timeout, TypeError → rede) e o `mapResponse` para um helper comum, reaproveitado pelas duas funções.
- `post`/`generateContent` passam a aceitar `timeoutMs` (geração usa ~90 s; 20 questões num modelo com "thinking" passam fácil de 45 s). `testConnection` mantém 45 s.
- Novos `GeminiErrorKind`: `'missing-key'`, `'invalid-response'`, `'blocked'`.
- `generateExam(apiKey, params): Promise<{ ok: true; questoes; modelo } | { ok: false; kind; message }>`:
  - chave vazia → `missing-key` sem chamar a rede;
  - `generationConfig: { responseMimeType: 'application/json', responseSchema, temperature padrão }`;
  - erro HTTP → mesmo mapeamento da Fase 1 (429 → "Limite do plano gratuito…", 400 chave inválida, 503 → sobrecarga já com retry/reserva);
  - resposta fora do formato → **1 nova tentativa**, depois `invalid-response` ("A IA devolveu uma prova fora do formato esperado. Tente gerar de novo; se persistir, simplifique o conteúdo ou reduza a quantidade de questões.");
  - bloqueio → `blocked` ("O Gemini se recusou a gerar esse conteúdo. Reformule o conteúdo ou as observações.").
  - `generateContent` passa a devolver também o modelo efetivamente usado (para gravar em `Exam.modelo`).

### Telas
- **`src/pages/NovaProva.tsx` (`#/provas/nova`)** — `<form noValidate>` no mesmo padrão do `PerfilForm` (erros abaixo do campo, `aria-invalid`/`aria-describedby`, foco no primeiro inválido):
  - Perfil (`select`); Disciplina (texto, padrão Ciências); Série (`select` 6º–9º); Turma(s) (texto livre, ex.: "7º A, 7º B"); Conteúdo (`textarea`, obrigatório); Quantidade (`number` 1–20); Alternativas (rádio 4/5); Dificuldade (rádio fácil/média/difícil/mista); Título (opcional, com o padrão como placeholder); Observações para a IA (`textarea`, opcional).
  - Sem perfis → `Aviso` "atenção" com link para cadastrar e botão desabilitado. Sem chave → `Aviso` "atenção" com link para Configurações e botão desabilitado.
  - Ao gerar: botão "Gerar prova" desabilitado com "Gerando…", `Aviso`/texto com `role="status"` ("Isso pode levar até um minuto."), campos travados (`fieldset disabled`) para evitar duplo envio.
  - Sucesso → monta o `Exam` (snapshot do perfil, `crypto.randomUUID()`), grava em `exams` e os parâmetros lembrados, e `navigate('/provas/:id', { state: { aviso: 'Prova gerada e salva.' } })`. A gravação acontece mesmo que a professora tenha saído da tela durante a geração (só a navegação depende de o componente continuar montado).
  - Erro → `Aviso` de erro com a mensagem; o formulário mantém tudo o que foi digitado. `StorageQuotaError` → "O armazenamento do navegador está cheio…".
- **`src/pages/Prova.tsx` (`#/provas/:id`)** — visualização simples (não é o layout de impressão): título, perfil/escola, série, turma(s), disciplina, dificuldade e data; questões numeradas com alternativas `a)`–`e)` (reaproveitando o visual da questão de exemplo de `Inicio.tsx`); seção "Gabarito" (`1 – c`, …). Id inexistente → `Aviso` de erro com link para "Nova prova". Botão "Gerar outra prova".
- **Componentes:** extrair `CampoTexto` de `PerfilForm.tsx` para `src/components/CampoTexto.tsx` (com variante `textarea`) e reutilizar nas duas telas; extrair a lista de alternativas do `Inicio.tsx` para `src/components/QuestaoView.tsx`, usada no `Inicio` e na `Prova`.
- **Navegação:** `src/router.tsx` ganha `provas/nova` e `provas/:id`; `src/components/Layout.tsx` ganha a aba "Nova prova" apontando para `/provas/nova` (ativa também em `/provas/:id` — usar `to="/provas"` com `end={false}` ou checar `useMatch('/provas/*')`).
- **Início:** o aviso de "tudo pronto" ganha um link "Gerar uma prova".
- **Estilo:** só classes e tokens existentes (`ficha`, `campo`, `btn-*`, `Aviso`); ícone novo `faisca` (gerar) no `Icone.tsx` se necessário.

## Arquivos
**Criar:**
- `src/lib/exams.ts`, `src/lib/exams.test.ts`
- `src/lib/examPrompt.ts`, `src/lib/examPrompt.test.ts`
- `src/lib/examResponse.ts`, `src/lib/examResponse.test.ts`
- `src/components/CampoTexto.tsx`, `src/components/QuestaoView.tsx`
- `src/pages/NovaProva.tsx`, `src/pages/Prova.tsx`, `src/pages/NovaProva.test.tsx`

**Alterar:**
- `src/lib/gemini.ts`, `src/lib/gemini.test.ts` (helper de erro comum, timeout parametrizável, `generateExam`)
- `src/router.tsx`, `src/components/Layout.tsx`, `src/components/Icone.tsx`
- `src/pages/PerfilForm.tsx` (usar `CampoTexto` extraído), `src/pages/Inicio.tsx` (`QuestaoView` + link)
- `docs/roadmap-provario.md` (Fase 3 → concluída e pendências resolvidas, no fim)

**Reutilizar:** `useStoredState`, `writeItem`/`StorageQuotaError` (`src/lib/storage.ts`); `listProfiles`/`sortProfiles` (`src/lib/profiles.ts`); `generateContent`/`mapResponse` (`src/lib/gemini.ts`); `Aviso`, `Icone`; `renderAt`/`semear` dos testes de `Perfis.test.tsx`; `mockFetch`/`jsonResponse` de `gemini.test.ts`.

## Passos de implementação (em ordem)
1. `exams.ts` + testes (tipos, defaults, `initialParams`, `validateParams`, `addExam`, `listExams` tolerante). Sem dependências.
2. `examPrompt.ts` + testes (prompt contém série, quantidade, nº de alternativas, dificuldade, observações delimitadas; schema com letras e limites certos). Depende de 1.
3. `examResponse.ts` + testes (casos válidos e cada motivo de rejeição). Depende de 1.
4. Refatorar `gemini.ts` (helper de erro comum, timeout) mantendo os testes da Fase 1 verdes; depois `generateExam` + testes. Depende de 2–3.
5. Extrair `CampoTexto` e `QuestaoView`; ajustar `PerfilForm` e `Inicio` (testes existentes devem continuar passando).
6. Rotas, aba "Nova prova" e ícone. Depende de 5.
7. `NovaProva.tsx` (formulário, validação, estados, gravação, navegação). Depende de 1, 4, 6.
8. `Prova.tsx` (visualização, não encontrada). Depende de 1, 5, 6.
9. `NovaProva.test.tsx` acompanhando 7–8.
10. Verificação: `npm run lint`, `npm test`, `npm run build` + testes manuais com chave real. Commit.
11. Marcar a Fase 3 como concluída no roadmap (e registrar modelo e prompt nas pendências) após conferência no site publicado.

## Testes e critérios de aceite
**Automatizados (Vitest + Testing Library, `fetch` mockado):**
- `exams`: `initialParams` usa lembrados e cai no primeiro perfil quando o lembrado foi excluído; `validateParams` (perfil, conteúdo, quantidade 0/21/decimal); título padrão; `listExams` com dado ausente/corrompido.
- `examPrompt`: conteúdo do prompt para cada dificuldade; schema com `enum` A–D ou A–E e `minItems/maxItems` = quantidade.
- `examResponse`: aceita resposta válida e converte letra → índice; rejeita JSON quebrado, nº errado de questões, nº errado de alternativas, alternativa vazia/duplicada, `correta` fora do intervalo, bloqueio e `MAX_TOKENS`; limpa prefixos "a)".
- `gemini.generateExam`: envia `responseMimeType` + `responseSchema` e a chave no header; sem chave não chama `fetch`; resposta inválida → 2 chamadas e `invalid-response`; inválida e depois válida → ok; 429 → mensagem de limite gratuito; 400 chave inválida; timeout e rede.
- `NovaProva.test.tsx`:
  - sem perfil → aviso com link e botão desabilitado; sem chave → aviso com link para Configurações
  - validação: conteúdo vazio e quantidade 25 → mensagens em pt-BR, `aria-invalid`, nenhuma chamada ao Gemini
  - geração ok com 5 questões e 5 alternativas → navega para `#/provas/:id`, mostra 5 questões com a)–e) e gabarito completo; prova gravada em `provario:exams` com snapshot do perfil
  - remontar em `#/provas/:id` (recarregar) → prova continua lá
  - resposta fora do formato duas vezes → erro claro, formulário preservado, nada gravado, tela não quebra
  - 429 → mensagem de limite do plano gratuito
  - durante a geração o botão fica desabilitado com "Gerando…"
  - parâmetros lembrados na próxima visita (conteúdo/título vazios)
  - `#/provas/inexistente` → aviso com link
  - aba "Nova prova" ativa em `/provas/:id`

**Manuais (com chave real):**
- Gerar 1, 10 e 20 questões, com 4 e 5 alternativas e cada dificuldade; conferir contagem, gabarito e qualidade pedagógica (ajustar o texto do prompt se preciso).
- Observações estranhas ou conteúdo vago não quebram a tela.
- Largura de celular (~375 px): formulário e visualização sem estouro horizontal.
- Medir o tamanho gravado de uma prova de 20 questões no DevTools.

**Critérios de conclusão (roadmap):**
- Uma prova com os parâmetros escolhidos é gerada com o número correto de questões e alternativas, e todas têm resposta no gabarito
- Uma resposta inválida da IA gera uma mensagem de erro clara, sem quebrar a tela
- A prova gerada continua disponível depois de recarregar a página

## Riscos e pontos em aberto
- **Cota do `localStorage`:** cada prova guarda o snapshot do perfil com a logo (dezenas de KB) + ~10–20 KB de texto; dá para centenas de provas dentro de ~5 MB. O erro de cota já é tratado. Se apertar, a Fase 6 pode deduplicar logos ou migrar para IndexedDB.
- **Suporte do `responseSchema` no modelo escolhido:** confirmar na documentação; se o modelo rejeitar o schema (400 "não suportado"), cair para `responseMimeType` apenas + a validação local, que já é estrita.
- **Tempo de resposta:** modelos com raciocínio podem passar de 60 s em 20 questões; timeout de 90 s e mensagem de espera. Se for lento demais, avaliar `thinkingConfig` com nível baixo.
- **Viés do gabarito** (muitas "C"): só tratado no prompt. Se persistir nos testes manuais, embaralhar as alternativas no cliente fica como ajuste (com cuidado com alternativas ordenadas, como números).
- **Qualidade pedagógica:** o texto do prompt será refinado nos testes manuais com a professora; fica isolado em `examPrompt.ts`.
- **Cota gratuita:** a nova tentativa automática gasta até 2 requisições por geração — aceitável no plano gratuito.

## Relatório de implementação

**Data:** 2026-10-01
**Abordagem:** combinação de fora para dentro: TDD para a lógica pura (`exams`, `examPrompt`, `examResponse`, `generateExam`) e cenários BDD (Vitest + Testing Library, `fetch` mockado) para as telas.
**Suíte:** 154 testes passando (76 antes da fase); `tsc -b`, `oxlint` e `npm run build` limpos.

| Item | Descrição (do plano) | Teste(s) | Resultado |
|---|---|---|---|
| P1 | `initialParams`: padrões, lembrados, perfil excluído | `exams.test.ts::initialParams` | ✅ |
| P2 | `validateParams` e título padrão | `exams.test.ts::validateParams`, `::título` | ✅ |
| P3 | `listExams` tolerante e `addExam` | `exams.test.ts::listExams / addExam` | ✅ |
| P4 | Prompt (série, quantidade, alternativas, dificuldade, observações) | `examPrompt.test.ts::buildExamPrompt` | ✅ |
| P5 | Schema com enum e limites | `examPrompt.test.ts::examResponseSchema` | ✅ |
| P6 | Resposta válida, `thought` ignorado, prefixos limpos | `examResponse.test.ts::aceita` | ✅ |
| P7 | Rejeições (JSON, contagens, vazio/duplicado, gabarito, bloqueio, `MAX_TOKENS`) | `examResponse.test.ts::rejeita` | ✅ |
| P8–P10 | `generateExam`: schema/chave, retry único, 429, 400, rede, timeout 90 s, modelo reserva | `gemini.test.ts::generateExam` | ✅ |
| P11 | Refatoração sem regressão da Fase 1 | `gemini.test.ts::testConnection` | ✅ |
| P12–P13 | Pré-condições e validação do formulário | `NovaProva.test.tsx` | ✅ |
| P14–P19 | Geração, persistência, snapshot, estados de carregamento e erro, parâmetros lembrados | `NovaProva.test.tsx::geração` | ✅ |
| P20–P21 | Prova inexistente, aba ativa, link no Início | `NovaProva.test.tsx` | ✅ |
| P22 | `CampoTexto`/`QuestaoView` extraídos sem regressão | `Perfis.test.tsx` | ✅ |
| P23 | Layout mobile, tamanho no `localStorage`, qualidade pedagógica | verificação manual | ✅ confirmada pelo usuário |

**Desvios / ajustes:**
- `Perfis.test.tsx`: expectativa da ordem das abas atualizada para incluir "Nova prova" (decisão do plano).
- Aba da navegação usa `Link` com `aria-current` manual (o `NavLink` não marca rotas filhas).
- Ajuste de layout pedido pelo usuário: `fieldset` do formulário deixou de usar `display: contents`, para o botão e a mensagem de feedback terem margem do card.
- Sem ferramenta de cobertura no projeto; nenhuma dependência adicionada.
