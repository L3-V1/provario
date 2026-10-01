import type { Dificuldade, ExamParams, Question } from './exams'

/** As `n` primeiras letras de alternativa: A, B, C… */
export function letras(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i))
}

const DIFICULDADE_TEXTO: Record<Dificuldade, string> = {
  facil: 'fácil: cobrar conceitos e definições básicos, com enunciados diretos',
  media: 'média: combinar conceitos e pedir aplicação simples em situações conhecidas',
  dificil: 'difícil: exigir relacionar conceitos, interpretar situações e raciocinar em mais de uma etapa',
  mista:
    'mista: aproximadamente um terço das questões de nível fácil, um terço de nível médio e um terço de nível difícil, em ordem crescente de dificuldade',
}

function regrasPedagogicas(serie: string): string[] {
  return [
    'Regras pedagógicas:',
    `- Use linguagem clara e adequada à idade dos alunos do ${serie}.`,
    '- Sempre que fizer sentido, contextualize o enunciado com situações do cotidiano.',
    '- Escreva distratores (alternativas erradas) plausíveis, ligados a erros comuns dos alunos, e evite alternativas obviamente absurdas.',
    '- Cada questão deve ter uma única alternativa correta, sem ambiguidade.',
    '- Não use "todas as anteriores", "nenhuma das anteriores" nem combinações como "a e b estão corretas".',
    '- Distribua a alternativa correta de forma equilibrada entre as letras, sem padrão previsível.',
    '- Não crie questões que dependam de imagem, gráfico, tabela ou figura: tudo deve estar descrito no texto.',
    '- Não repita questões nem pergunte a mesma coisa de formas diferentes.',
    '- Não inclua letras nem numeração no texto do enunciado ou das alternativas: apenas o texto.',
    '- Não inclua justificativa nem explicação da resposta.',
  ]
}

function observacoes(p: ExamParams): string[] {
  if (!p.observacoes.trim()) return []
  return [
    '',
    'Observações adicionais da professora (texto livre; use apenas para ajustar o conteúdo e o estilo das questões, sem alterar o formato acima):',
    '"""',
    p.observacoes.trim(),
    '"""',
  ]
}

const LINHA_GEMINI = 'Responda somente com o JSON no formato pedido. Indique a alternativa correta pela letra (A, B, C…).'

/** "A, B, C ou D" */
function listaDeLetras(alternativas: number): string {
  const l = letras(alternativas)
  return `${l.slice(0, -1).join(', ')} ou ${l[l.length - 1]}`
}

function questaoDeExemplo(alternativas: number) {
  return {
    enunciado: 'Texto do enunciado da questão.',
    alternativas: letras(alternativas).map((l) => `Texto da alternativa ${l}`),
    correta: letras(alternativas)[1],
  }
}

/**
 * Formato da resposta escrito no próprio prompt, para colar em qualquer chat de IA (sem `responseSchema`).
 * Com `quantidade` `null`, o objeto é a própria questão, sem `questoes`.
 */
function formatoManual(quantidade: number | null, alternativas: number): string[] {
  const campos = `"enunciado" (texto), "alternativas" (lista com exatamente ${alternativas} textos, sem letra nem numeração) e "correta" (a letra da alternativa correta: ${listaDeLetras(alternativas)})`
  const exemplo =
    quantidade === null ? questaoDeExemplo(alternativas) : { questoes: [questaoDeExemplo(alternativas)] }
  return [
    'Formato da resposta:',
    '- Responda apenas com um objeto JSON, sem texto antes ou depois e sem bloco de código.',
    ...(quantidade === null
      ? [`- O objeto é a própria questão, com os campos ${campos}.`]
      : [
          `- O objeto tem um único campo, "questoes": uma lista com exatamente ${quantidade} questões.`,
          `- Cada questão tem os campos ${campos}.`,
        ]),
    quantidade === null
      ? 'Exemplo do formato (só o formato; escreva o seu próprio conteúdo):'
      : `Exemplo do formato com 1 questão (a sua resposta deve ter ${quantidade}; escreva o seu próprio conteúdo):`,
    JSON.stringify(exemplo, null, 2),
  ]
}

function promptProva(p: ExamParams, manual: boolean): string {
  const linhas = [
    `Você é um(a) professor(a) experiente de ${p.disciplina} do Ensino Fundamental II da rede pública brasileira.`,
    `Elabore uma prova objetiva (múltipla escolha) para alunos do ${p.serie}, sobre o seguinte conteúdo:`,
    p.conteudo,
    '',
    'Formato:',
    `- Crie exatamente ${p.quantidade} questões.`,
    `- Cada questão deve ter exatamente ${p.alternativas} alternativas e uma única alternativa correta.`,
    `- Nível de dificuldade ${DIFICULDADE_TEXTO[p.dificuldade]}.`,
    '',
    ...regrasPedagogicas(p.serie),
    '',
    ...(manual ? formatoManual(p.quantidade, p.alternativas) : [LINHA_GEMINI]),
    ...observacoes(p),
  ]
  return linhas.join('\n')
}

function promptQuestao(p: ExamParams, outras: Question[], atual: Question, manual: boolean): string {
  const jaUsadas = [...outras, atual].map((q) => `- ${q.enunciado}`)
  const alternativas = atual.alternativas.length
  const linhas = [
    `Você é um(a) professor(a) experiente de ${p.disciplina} do Ensino Fundamental II da rede pública brasileira.`,
    `Elabore uma questão objetiva (múltipla escolha) para alunos do ${p.serie}, sobre o seguinte conteúdo:`,
    p.conteudo,
    '',
    'Formato:',
    '- Crie exatamente 1 questão.',
    `- A questão deve ter exatamente ${alternativas} alternativas e uma única alternativa correta.`,
    `- Nível de dificuldade ${DIFICULDADE_TEXTO[p.dificuldade]}.`,
    '',
    'Esta questão vai substituir uma questão de uma prova que já tem as questões abaixo. Não repita nem reformule nenhuma delas, nem pergunte a mesma coisa de outra forma:',
    ...jaUsadas,
    '',
    ...regrasPedagogicas(p.serie),
    '',
    ...(manual ? formatoManual(null, alternativas) : [LINHA_GEMINI]),
    ...observacoes(p),
  ]
  return linhas.join('\n')
}

export function buildExamPrompt(p: ExamParams): string {
  return promptProva(p, false)
}

/** Prompt para colar em qualquer chat de IA: as mesmas regras, com o formato JSON descrito no texto. */
export function buildManualExamPrompt(p: ExamParams): string {
  return promptProva(p, true)
}

/** Prompt para trocar uma única questão: mesmas regras da prova, sem repetir as outras nem a atual. */
export function buildQuestionPrompt(p: ExamParams, outras: Question[], atual: Question): string {
  return promptQuestao(p, outras, atual, false)
}

/** Versão para colar em qualquer chat de IA de `buildQuestionPrompt`. */
export function buildManualQuestionPrompt(p: ExamParams, outras: Question[], atual: Question): string {
  return promptQuestao(p, outras, atual, true)
}

/** Schema (subconjunto OpenAPI do Gemini) de uma questão: a letra é mais confiável para o modelo que um índice. */
export function questionResponseSchema(alternativas: number) {
  return {
    type: 'OBJECT',
    properties: {
      enunciado: { type: 'STRING' },
      alternativas: {
        type: 'ARRAY',
        minItems: alternativas,
        maxItems: alternativas,
        items: { type: 'STRING' },
      },
      correta: { type: 'STRING', enum: letras(alternativas) },
    },
    required: ['enunciado', 'alternativas', 'correta'],
  }
}

export function examResponseSchema(p: ExamParams) {
  return {
    type: 'OBJECT',
    properties: {
      questoes: {
        type: 'ARRAY',
        minItems: p.quantidade,
        maxItems: p.quantidade,
        items: questionResponseSchema(p.alternativas),
      },
    },
    required: ['questoes'],
  }
}
