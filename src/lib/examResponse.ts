import type { ExamParams, Question } from './exams'
import { letras } from './examPrompt'

export type ParseResult =
  | { ok: true; questoes: Question[] }
  | { ok: false; kind: 'format' | 'blocked' | 'truncated'; motivo: string }

const falha = (kind: 'format' | 'blocked' | 'truncated', motivo: string): ParseResult => ({
  ok: false,
  kind,
  motivo,
})

type Part = { text?: unknown; thought?: unknown }
type Body = {
  promptFeedback?: { blockReason?: unknown }
  candidates?: { finishReason?: unknown; content?: { parts?: Part[] } }[]
}

// "a) ", "B. ", "(c) ", "D - ", "1. " no início do texto. Exige o separador para não cortar "Aorta".
const PREFIXO = /^\s*\(?([A-Ea-e]|\d{1,2})\s*(\)|\.|-|–|:)\s+/

function limpar(texto: string): string {
  return texto.replace(PREFIXO, '').trim()
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '')

/** Valida a resposta do Gemini contra o que foi pedido; só devolve questões prontas para salvar. */
export function parseExamResponse(body: unknown, params: ExamParams): ParseResult {
  const b = (body ?? {}) as Body
  const candidato = b.candidates?.[0]

  if (b.promptFeedback?.blockReason || candidato?.finishReason === 'SAFETY') {
    return falha('blocked', 'O Gemini bloqueou o conteúdo.')
  }
  if (candidato?.finishReason === 'MAX_TOKENS') {
    return falha('truncated', 'A resposta foi cortada antes de terminar.')
  }

  const bruto = (candidato?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')
  if (!bruto.trim()) return falha('format', 'A resposta veio vazia.')

  let dados: unknown
  try {
    dados = JSON.parse(bruto)
  } catch {
    return falha('format', 'A resposta não é um JSON válido.')
  }

  const lista = (dados as { questoes?: unknown } | null)?.questoes
  if (!Array.isArray(lista) || lista.length !== params.quantidade) {
    return falha('format', `Esperava ${params.quantidade} questões, mas vieram ${Array.isArray(lista) ? lista.length : 0}.`)
  }

  const validas = letras(params.alternativas)
  const questoes: Question[] = []
  for (const [i, item] of lista.entries()) {
    const n = i + 1
    const raw = (item ?? {}) as { enunciado?: unknown; alternativas?: unknown; correta?: unknown }
    const enunciado = limpar(texto(raw.enunciado))
    if (!enunciado) return falha('format', `A questão ${n} está sem enunciado.`)

    if (!Array.isArray(raw.alternativas) || raw.alternativas.length !== params.alternativas) {
      return falha('format', `A questão ${n} não tem ${params.alternativas} alternativas.`)
    }
    const alternativas = raw.alternativas.map((a) => limpar(texto(a)))
    if (alternativas.some((a) => a === '')) {
      return falha('format', `A questão ${n} tem alternativa vazia.`)
    }
    const unicas = new Set(alternativas.map((a) => a.toLocaleLowerCase('pt-BR')))
    if (unicas.size !== alternativas.length) {
      return falha('format', `A questão ${n} tem alternativas repetidas.`)
    }

    const correta = validas.indexOf(texto(raw.correta).trim().toUpperCase())
    if (correta === -1) return falha('format', `A questão ${n} está sem gabarito válido.`)

    questoes.push({ enunciado, alternativas, correta })
  }
  return { ok: true, questoes }
}
