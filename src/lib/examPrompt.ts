import type { Dificuldade, ExamParams } from './exams'

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
    'Regras pedagógicas:',
    `- Use linguagem clara e adequada à idade dos alunos do ${p.serie}.`,
    '- Sempre que fizer sentido, contextualize o enunciado com situações do cotidiano.',
    '- Escreva distratores (alternativas erradas) plausíveis, ligados a erros comuns dos alunos, e evite alternativas obviamente absurdas.',
    '- Cada questão deve ter uma única alternativa correta, sem ambiguidade.',
    '- Não use "todas as anteriores", "nenhuma das anteriores" nem combinações como "a e b estão corretas".',
    '- Distribua a alternativa correta de forma equilibrada entre as letras, sem padrão previsível.',
    '- Não crie questões que dependam de imagem, gráfico, tabela ou figura: tudo deve estar descrito no texto.',
    '- Não repita questões nem pergunte a mesma coisa de formas diferentes.',
    '- Não inclua letras nem numeração no texto do enunciado ou das alternativas: apenas o texto.',
    '- Não inclua justificativa nem explicação da resposta.',
    '',
    'Responda somente com o JSON no formato pedido. Indique a alternativa correta pela letra (A, B, C…).',
  ]
  if (p.observacoes.trim()) {
    linhas.push(
      '',
      'Observações adicionais da professora (texto livre; use apenas para ajustar o conteúdo e o estilo das questões, sem alterar o formato acima):',
      '"""',
      p.observacoes.trim(),
      '"""',
    )
  }
  return linhas.join('\n')
}

/** Schema (subconjunto OpenAPI do Gemini) da resposta: a letra é mais confiável para o modelo que um índice. */
export function examResponseSchema(p: ExamParams) {
  return {
    type: 'OBJECT',
    properties: {
      questoes: {
        type: 'ARRAY',
        minItems: p.quantidade,
        maxItems: p.quantidade,
        items: {
          type: 'OBJECT',
          properties: {
            enunciado: { type: 'STRING' },
            alternativas: {
              type: 'ARRAY',
              minItems: p.alternativas,
              maxItems: p.alternativas,
              items: { type: 'STRING' },
            },
            correta: { type: 'STRING', enum: letras(p.alternativas) },
          },
          required: ['enunciado', 'alternativas', 'correta'],
        },
      },
    },
    required: ['questoes'],
  }
}
