import { describe, expect, it } from 'vitest'
import type { ExamParams } from './exams'
import { parseExamResponse } from './examResponse'

function params(over: Partial<ExamParams> = {}): ExamParams {
  return {
    perfilId: 'p1',
    disciplina: 'Ciências',
    serie: '7º ano',
    turmas: '',
    conteudo: 'x',
    quantidade: 2,
    alternativas: 4,
    dificuldade: 'media',
    titulo: '',
    observacoes: '',
    ...over,
  }
}

const q = (over: Record<string, unknown> = {}) => ({
  enunciado: 'Qual é a organela da respiração?',
  alternativas: ['Ribossomo', 'Mitocôndria', 'Golgi', 'Lisossomo'],
  correta: 'B',
  ...over,
})

function corpo(questoes: unknown[], extra: Record<string, unknown> = {}) {
  return {
    candidates: [
      { content: { parts: [{ text: JSON.stringify({ questoes }) }] }, finishReason: 'STOP', ...extra },
    ],
  }
}

function motivo(body: unknown, p = params()) {
  const r = parseExamResponse(body, p)
  if (r.ok) throw new Error('esperava rejeição')
  return r
}

describe('parseExamResponse — aceita', () => {
  it('resposta válida: converte a letra em índice', () => {
    const r = parseExamResponse(corpo([q(), q({ correta: 'D' })]), params())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.questoes).toHaveLength(2)
      expect(r.questoes[0].correta).toBe(1)
      expect(r.questoes[1].correta).toBe(3)
      expect(r.questoes[0].alternativas[1]).toBe('Mitocôndria')
    }
  })

  it('5 alternativas aceita a letra E', () => {
    const r = parseExamResponse(
      corpo([q({ alternativas: ['a1', 'b2', 'c3', 'd4', 'e5'], correta: 'E' })]),
      params({ quantidade: 1, alternativas: 5 }),
    )
    expect(r.ok && r.questoes[0].correta).toBe(4)
  })

  it('junta várias partes de texto e ignora partes de raciocínio (thought)', () => {
    const json = JSON.stringify({ questoes: [q()] })
    const body = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'pensando...', thought: true },
              { text: json.slice(0, 20) },
              { text: json.slice(20) },
            ],
          },
        },
      ],
    }
    expect(parseExamResponse(body, params({ quantidade: 1 })).ok).toBe(true)
  })

  it('remove prefixos como "a) ", "B. " e "1 - " e apara espaços', () => {
    const r = parseExamResponse(
      corpo([
        q({
          enunciado: '  1. Qual é a organela?  ',
          alternativas: ['a) Ribossomo', 'B. Mitocôndria', '(c) Golgi', ' D - Lisossomo '],
        }),
      ]),
      params({ quantidade: 1 }),
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.questoes[0].enunciado).toBe('Qual é a organela?')
      expect(r.questoes[0].alternativas).toEqual(['Ribossomo', 'Mitocôndria', 'Golgi', 'Lisossomo'])
    }
  })

  it('não remove letras que fazem parte do texto', () => {
    const r = parseExamResponse(
      corpo([q({ alternativas: ['Aorta', 'Bile', 'Cálcio', 'DNA'] })]),
      params({ quantidade: 1 }),
    )
    expect(r.ok && r.questoes[0].alternativas).toEqual(['Aorta', 'Bile', 'Cálcio', 'DNA'])
  })
})

describe('parseExamResponse — rejeita', () => {
  it('JSON quebrado', () => {
    const body = { candidates: [{ content: { parts: [{ text: '{"questoes": [' }] } }] }
    expect(motivo(body).kind).toBe('format')
  })

  it('sem texto algum', () => {
    expect(motivo({}).kind).toBe('format')
    expect(motivo(null).kind).toBe('format')
  })

  it('nº errado de questões', () => {
    const r = motivo(corpo([q()]))
    expect(r.kind).toBe('format')
    expect(r.motivo).toMatch(/2 questões/)
  })

  it('nº errado de alternativas', () => {
    const r = motivo(corpo([q(), q({ alternativas: ['a', 'b', 'c'] })]))
    expect(r.kind).toBe('format')
    expect(r.motivo).toMatch(/questão 2/)
  })

  it('alternativa vazia', () => {
    expect(motivo(corpo([q(), q({ alternativas: ['a', 'b', ' ', 'd'] })])).kind).toBe('format')
  })

  it('alternativas duplicadas', () => {
    expect(motivo(corpo([q(), q({ alternativas: ['a', 'b', 'A', 'd'] })])).kind).toBe('format')
  })

  it('enunciado vazio', () => {
    expect(motivo(corpo([q(), q({ enunciado: '  ' })])).kind).toBe('format')
  })

  it('correta fora das letras válidas', () => {
    expect(motivo(corpo([q(), q({ correta: 'E' })])).kind).toBe('format')
    expect(motivo(corpo([q(), q({ correta: 'Z' })])).kind).toBe('format')
    expect(motivo(corpo([q(), q({ correta: undefined })])).kind).toBe('format')
  })

  it('bloqueio por promptFeedback.blockReason', () => {
    expect(motivo({ promptFeedback: { blockReason: 'SAFETY' } }).kind).toBe('blocked')
  })

  it('bloqueio por finishReason SAFETY', () => {
    expect(motivo(corpo([q(), q()], { finishReason: 'SAFETY' })).kind).toBe('blocked')
  })

  it('MAX_TOKENS é um motivo distinto (resposta cortada)', () => {
    const r = motivo(corpo([q(), q()], { finishReason: 'MAX_TOKENS' }))
    expect(r.kind).toBe('truncated')
  })
})
