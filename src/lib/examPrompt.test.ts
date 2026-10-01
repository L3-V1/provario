import { describe, expect, it } from 'vitest'
import type { ExamParams } from './exams'
import type { Question } from './exams'
import {
  buildExamPrompt,
  buildManualExamPrompt,
  buildManualQuestionPrompt,
  buildQuestionPrompt,
  examResponseSchema,
  letras,
  questionResponseSchema,
} from './examPrompt'

function params(over: Partial<ExamParams> = {}): ExamParams {
  return {
    perfilId: 'p1',
    disciplina: 'Ciências',
    serie: '7º ano',
    turmas: '7º A',
    conteudo: 'Organelas celulares',
    quantidade: 8,
    alternativas: 4,
    dificuldade: 'media',
    titulo: '',
    observacoes: '',
    ...over,
  }
}

describe('buildExamPrompt', () => {
  it('cita disciplina, série, conteúdo, quantidade exata e nº de alternativas', () => {
    const p = buildExamPrompt(params({ quantidade: 8, alternativas: 5 }))
    expect(p).toContain('professor(a) experiente de Ciências')
    expect(p).toContain('7º ano')
    expect(p).toContain('Organelas celulares')
    expect(p).toContain('exatamente 8 questões')
    expect(p).toContain('exatamente 5 alternativas')
  })

  it('traz as regras pedagógicas combinadas', () => {
    const p = buildExamPrompt(params())
    expect(p).toMatch(/cotidiano/)
    expect(p).toMatch(/distratores/)
    expect(p).toMatch(/uma única alternativa correta/)
    expect(p).toMatch(/todas as anteriores/)
    expect(p).toMatch(/imagem/)
    expect(p).toMatch(/letras/)
  })

  it.each([
    ['facil', /fácil/i],
    ['media', /média/i],
    ['dificil', /difícil/i],
  ] as const)('dificuldade %s aparece no prompt', (d, re) => {
    expect(buildExamPrompt(params({ dificuldade: d }))).toMatch(re)
  })

  it('dificuldade mista pede cerca de um terço de cada nível', () => {
    expect(buildExamPrompt(params({ dificuldade: 'mista' }))).toMatch(/um terço/)
  })

  it('observações da professora vão delimitadas como texto do usuário', () => {
    const p = buildExamPrompt(params({ observacoes: 'Use exemplos de Santos' }))
    expect(p).toContain('"""\nUse exemplos de Santos\n"""')
  })

  it('sem observações, não há bloco de observações', () => {
    expect(buildExamPrompt(params())).not.toContain('"""')
  })
})

describe('examResponseSchema', () => {
  it('4 alternativas: enum A–D e limites iguais à quantidade', () => {
    const s = examResponseSchema(params({ quantidade: 6, alternativas: 4 }))
    const q = s.properties.questoes
    expect(q.minItems).toBe(6)
    expect(q.maxItems).toBe(6)
    expect(q.items.properties.alternativas.minItems).toBe(4)
    expect(q.items.properties.alternativas.maxItems).toBe(4)
    expect(q.items.properties.correta.enum).toEqual(['A', 'B', 'C', 'D'])
    expect(q.items.required).toEqual(['enunciado', 'alternativas', 'correta'])
  })

  it('5 alternativas: enum A–E', () => {
    const s = examResponseSchema(params({ alternativas: 5 }))
    expect(s.properties.questoes.items.properties.correta.enum).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(s.properties.questoes.items.properties.alternativas.maxItems).toBe(5)
  })
})

describe('letras', () => {
  it('devolve as n primeiras letras maiúsculas', () => {
    expect(letras(5)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })
})

const questao = (enunciado: string, n = 4): Question => ({
  enunciado,
  alternativas: Array.from({ length: n }, (_, i) => `Opção ${i}`),
  correta: 0,
})

describe('buildQuestionPrompt', () => {
  const outras = [questao('Enunciado da outra A'), questao('Enunciado da outra B')]
  const atual = questao('Enunciado da questão atual', 5)

  it('pede uma única questão, com o nº de alternativas da questão atual', () => {
    const p = buildQuestionPrompt(params({ alternativas: 4 }), outras, atual)
    expect(p).toContain('exatamente 1 questão')
    expect(p).toContain('exatamente 5 alternativas')
    expect(p).not.toContain('exatamente 4 alternativas')
  })

  it('manda não repetir nem reformular as outras e a atual', () => {
    const p = buildQuestionPrompt(params(), outras, atual)
    expect(p).toMatch(/não repita/i)
    expect(p).toContain('Enunciado da outra A')
    expect(p).toContain('Enunciado da outra B')
    expect(p).toContain('Enunciado da questão atual')
  })

  it('preserva conteúdo, série, dificuldade e observações', () => {
    const p = buildQuestionPrompt(params({ dificuldade: 'dificil', observacoes: 'Use exemplos de Santos' }), outras, atual)
    expect(p).toContain('Organelas celulares')
    expect(p).toContain('7º ano')
    expect(p).toContain('difícil')
    expect(p).toContain('Use exemplos de Santos')
  })

  it('omite observações vazias e funciona sem outras questões', () => {
    const p = buildQuestionPrompt(params({ observacoes: '  ' }), [], atual)
    expect(p).not.toContain('Observações adicionais')
  })

  it('reaproveita as regras pedagógicas da prova', () => {
    const regra = '- Não use "todas as anteriores", "nenhuma das anteriores" nem combinações como "a e b estão corretas".'
    expect(buildExamPrompt(params())).toContain(regra)
    expect(buildQuestionPrompt(params(), outras, atual)).toContain(regra)
  })
})

describe('questionResponseSchema', () => {
  it('descreve um objeto de questão com a correta como letra', () => {
    const s = questionResponseSchema(5)
    expect(s.type).toBe('OBJECT')
    expect(s.required).toEqual(['enunciado', 'alternativas', 'correta'])
    expect(s.properties.alternativas).toMatchObject({ minItems: 5, maxItems: 5 })
    expect(s.properties.correta.enum).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('é o mesmo formato de cada item do schema da prova', () => {
    const item = examResponseSchema(params({ alternativas: 4 })).properties.questoes.items
    expect(questionResponseSchema(4)).toEqual(item)
  })
})

/** O exemplo JSON do prompt manual: do primeiro "{" ao último "}" (sem observações no fim). */
function exemplo(prompt: string): unknown {
  return JSON.parse(prompt.slice(prompt.indexOf('{'), prompt.lastIndexOf('}') + 1))
}

describe('buildManualExamPrompt', () => {
  it('mantém o pedido, a quantidade e as regras pedagógicas do prompt do Gemini', () => {
    const p = buildManualExamPrompt(params({ quantidade: 10, alternativas: 5 }))
    expect(p).toContain('Organelas celulares')
    expect(p).toContain('7º ano')
    expect(p).toContain('exatamente 10 questões')
    expect(p).toContain('exatamente 5 alternativas')
    expect(p).toContain('Regras pedagógicas:')
    expect(p).toMatch(/distratores/)
    expect(p).toContain('- Não use "todas as anteriores", "nenhuma das anteriores" nem combinações como "a e b estão corretas".')
  })

  it('descreve o formato JSON no texto: sem texto ao redor, campos e letras certas', () => {
    const p = buildManualExamPrompt(params({ quantidade: 10, alternativas: 4 }))
    expect(p).toContain('Responda apenas com um objeto JSON, sem texto antes ou depois e sem bloco de código.')
    expect(p).toMatch(/"questoes".*exatamente 10/)
    expect(p).toMatch(/"alternativas".*exatamente 4/)
    expect(p).toContain('A, B, C ou D')
    expect(p).not.toContain('Responda somente com o JSON no formato pedido')
  })

  it.each([4, 5] as const)('traz um exemplo JSON válido com %i alternativas e a correta como letra', (k) => {
    const ex = exemplo(buildManualExamPrompt(params({ alternativas: k }))) as {
      questoes: { enunciado: string; alternativas: string[]; correta: string }[]
    }
    expect(ex.questoes).toHaveLength(1)
    expect(ex.questoes[0].enunciado).toBeTruthy()
    expect(ex.questoes[0].alternativas).toHaveLength(k)
    expect(letras(k)).toContain(ex.questoes[0].correta)
  })

  it('5 alternativas aceita a letra E', () => {
    expect(buildManualExamPrompt(params({ alternativas: 5 }))).toContain('A, B, C, D ou E')
  })

  it('as observações da professora continuam no fim', () => {
    const p = buildManualExamPrompt(params({ observacoes: 'Use exemplos de Santos' }))
    expect(p.endsWith('"""\nUse exemplos de Santos\n"""')).toBe(true)
    expect(p.indexOf('Exemplo')).toBeLessThan(p.indexOf('Use exemplos de Santos'))
  })
})

describe('buildManualQuestionPrompt', () => {
  const outras = [questao('Enunciado da outra A'), questao('Enunciado da outra B')]
  const atual = questao('Enunciado da questão atual', 5)

  it('lista os enunciados existentes e manda não repetir', () => {
    const p = buildManualQuestionPrompt(params(), outras, atual)
    expect(p).toMatch(/não repita/i)
    for (const e of ['Enunciado da outra A', 'Enunciado da outra B', 'Enunciado da questão atual']) expect(p).toContain(e)
    expect(p).toContain('exatamente 1 questão')
    expect(p).toContain('Regras pedagógicas:')
  })

  it('o exemplo é a própria questão, sem `questoes`, com o nº de alternativas da atual', () => {
    const p = buildManualQuestionPrompt(params({ alternativas: 4 }), outras, atual)
    expect(p).toContain('Responda apenas com um objeto JSON, sem texto antes ou depois e sem bloco de código.')
    expect(p).not.toMatch(/"questoes"/)
    const ex = exemplo(p) as { enunciado: string; alternativas: string[]; correta: string }
    expect(ex.alternativas).toHaveLength(5)
    expect(letras(5)).toContain(ex.correta)
    expect(p).toContain('A, B, C, D ou E')
  })

  it('observações no fim', () => {
    const p = buildManualQuestionPrompt(params({ observacoes: 'Sem cálculos' }), outras, atual)
    expect(p.endsWith('"""\nSem cálculos\n"""')).toBe(true)
  })
})

describe('prompts do Gemini continuam sem o formato no texto', () => {
  it('sem exemplo e com a linha de sempre', () => {
    const linha = 'Responda somente com o JSON no formato pedido. Indique a alternativa correta pela letra (A, B, C…).'
    for (const p of [buildExamPrompt(params()), buildQuestionPrompt(params(), [], questao('Atual'))]) {
      expect(p).toContain(linha)
      expect(p).not.toContain('Exemplo')
      expect(p).not.toContain('{')
    }
  })
})
