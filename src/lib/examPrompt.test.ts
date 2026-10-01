import { describe, expect, it } from 'vitest'
import type { ExamParams } from './exams'
import { buildExamPrompt, examResponseSchema, letras } from './examPrompt'

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
