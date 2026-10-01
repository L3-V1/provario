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

export function buildExamPrompt(p: ExamParams): string {
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
    'Responda somente com o JSON no formato pedido. Indique a alternativa correta pela letra (A, B, C…).',
    ...observacoes(p),
  ]
  return linhas.join('\n')
}

/** Prompt para trocar uma única questão: mesmas regras da prova, sem repetir as outras nem a atual. */
export function buildQuestionPrompt(p: ExamParams, outras: Question[], atual: Question): string {
  const jaUsadas = [...outras, atual].map((q) => `- ${q.enunciado}`)
  const linhas = [
    `Você é um(a) professor(a) experiente de ${p.disciplina} do Ensino Fundamental II da rede pública brasileira.`,
    `Elabore uma questão objetiva (múltipla escolha) para alunos do ${p.serie}, sobre o seguinte conteúdo:`,
    p.conteudo,
    '',
    'Formato:',
    '- Crie exatamente 1 questão.',
    `- A questão deve ter exatamente ${atual.alternativas.length} alternativas e uma única alternativa correta.`,
    `- Nível de dificuldade ${DIFICULDADE_TEXTO[p.dificuldade]}.`,
    '',
    'Esta questão vai substituir uma questão de uma prova que já tem as questões abaixo. Não repita nem reformule nenhuma delas, nem pergunte a mesma coisa de outra forma:',
    ...jaUsadas,
    '',
    ...regrasPedagogicas(p.serie),
    '',
    'Responda somente com o JSON no formato pedido. Indique a alternativa correta pela letra (A, B, C…).',
    ...observacoes(p),
  ]
  return linhas.join('\n')
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
