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

type Extraido = { ok: true; dados: unknown } | Extract<ParseResult, { ok: false }>

/** Trata bloqueio, truncamento e JSON da resposta; o formato do conteúdo é problema de quem chama. */
function extrairDados(body: unknown): Extraido {
  const b = (body ?? {}) as Body
  const candidato = b.candidates?.[0]

  if (b.promptFeedback?.blockReason || candidato?.finishReason === 'SAFETY') {
    return falha('blocked', 'O Gemini bloqueou o conteúdo.') as Extraido
  }
  if (candidato?.finishReason === 'MAX_TOKENS') {
    return falha('truncated', 'A resposta foi cortada antes de terminar.') as Extraido
  }

  const bruto = (candidato?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')
  if (!bruto.trim()) return falha('format', 'A resposta veio vazia.') as Extraido

  try {
    return { ok: true, dados: JSON.parse(bruto) }
  } catch {
    return falha('format', 'A resposta não é um JSON válido.') as Extraido
  }
}

type QuestaoResult = { ok: true; questao: Question } | { ok: false; motivo: string }

/** Valida uma questão crua; `n` é o número mostrado nas mensagens de erro. */
function parseQuestion(item: unknown, n: number, alternativasEsperadas: number): QuestaoResult {
  const erro = (motivo: string): QuestaoResult => ({ ok: false, motivo })
  const raw = (item ?? {}) as { enunciado?: unknown; alternativas?: unknown; correta?: unknown }
  const enunciado = limpar(texto(raw.enunciado))
  if (!enunciado) return erro(`A questão ${n} está sem enunciado.`)

  if (!Array.isArray(raw.alternativas) || raw.alternativas.length !== alternativasEsperadas) {
    return erro(`A questão ${n} não tem ${alternativasEsperadas} alternativas.`)
  }
  const alternativas = raw.alternativas.map((a) => limpar(texto(a)))
  if (alternativas.some((a) => a === '')) return erro(`A questão ${n} tem alternativa vazia.`)
  const unicas = new Set(alternativas.map((a) => a.toLocaleLowerCase('pt-BR')))
  if (unicas.size !== alternativas.length) return erro(`A questão ${n} tem alternativas repetidas.`)

  const correta = letras(alternativasEsperadas).indexOf(texto(raw.correta).trim().toUpperCase())
  if (correta === -1) return erro(`A questão ${n} está sem gabarito válido.`)

  return { ok: true, questao: { enunciado, alternativas, correta } }
}

/** Valida o conteúdo de uma prova (objeto com `questoes`) contra o que foi pedido. */
export function parseExamData(dados: unknown, params: ExamParams): ParseResult {
  const lista = (dados as { questoes?: unknown } | null)?.questoes
  if (!Array.isArray(lista) || lista.length !== params.quantidade) {
    return falha('format', `Esperava ${params.quantidade} questões, mas vieram ${Array.isArray(lista) ? lista.length : 0}.`)
  }

  const questoes: Question[] = []
  for (const [i, item] of lista.entries()) {
    const r = parseQuestion(item, i + 1, params.alternativas)
    if (!r.ok) return falha('format', r.motivo)
    questoes.push(r.questao)
  }
  return { ok: true, questoes }
}

/** Valida a resposta do Gemini contra o que foi pedido; só devolve questões prontas para salvar. */
export function parseExamResponse(body: unknown, params: ExamParams): ParseResult {
  const extraido = extrairDados(body)
  if (!extraido.ok) return extraido
  return parseExamData(extraido.dados, params)
}

export type QuestionParseResult =
  | { ok: true; questao: Question }
  | { ok: false; kind: 'format' | 'blocked' | 'truncated'; motivo: string }

const normalizar = (texto: string) => texto.trim().toLocaleLowerCase('pt-BR')

/** Valida uma questão avulsa; enunciado igual ao de uma das `outras` é recusado. */
export function parseQuestionData(dados: unknown, alternativas: number, outras: Question[] = []): QuestionParseResult {
  const r = parseQuestion(dados, 1, alternativas)
  if (!r.ok) return { ok: false, kind: 'format', motivo: r.motivo }
  const existentes = new Set(outras.map((q) => normalizar(q.enunciado)))
  if (existentes.has(normalizar(r.questao.enunciado))) {
    return { ok: false, kind: 'format', motivo: 'A questão nova repete uma que já está na prova.' }
  }
  return r
}

/** Valida a resposta do Gemini para a regeração de uma única questão. */
export function parseQuestionResponse(body: unknown, alternativas: number, outras: Question[] = []): QuestionParseResult {
  const extraido = extrairDados(body)
  if (!extraido.ok) return extraido
  return parseQuestionData(extraido.dados, alternativas, outras)
}

// Primeiro bloco de código, com ou sem linguagem (```json … ```).
const BLOCO_DE_CODIGO = /```[\w-]*[^\S\n]*\n?([\s\S]*?)```/

/**
 * Tira o JSON do texto colado de um chat de IA: tolera bloco de código e texto antes ou depois,
 * mas não conserta JSON malformado.
 */
export function extrairJsonColado(texto: string): { ok: true; dados: unknown } | { ok: false; motivo: string } {
  if (!texto.trim()) return { ok: false, motivo: 'Cole a resposta do chat de IA.' }

  let candidato = BLOCO_DE_CODIGO.exec(texto)?.[1]
  if (candidato === undefined) {
    const inicio = texto.search(/[{[]/)
    const fim = Math.max(texto.lastIndexOf('}'), texto.lastIndexOf(']'))
    candidato = inicio >= 0 && fim > inicio ? texto.slice(inicio, fim + 1) : ''
  }
  try {
    return { ok: true, dados: JSON.parse(candidato) }
  } catch {
    return {
      ok: false,
      motivo: 'Não encontrei um JSON válido na resposta. Copie a resposta inteira do chat, do começo ao fim.',
    }
  }
}

/** Valida a prova colada do chat; aceita também uma lista solta de questões. */
export function parsePastedExam(texto: string, params: ExamParams): ParseResult {
  const extraido = extrairJsonColado(texto)
  if (!extraido.ok) return falha('format', extraido.motivo)
  const dados = Array.isArray(extraido.dados) ? { questoes: extraido.dados } : extraido.dados
  return parseExamData(dados, params)
}

/** Valida a questão colada do chat; aceita também `{ questoes: [uma] }` ou `[uma]`. */
export function parsePastedQuestion(texto: string, alternativas: number, outras: Question[]): QuestionParseResult {
  const extraido = extrairJsonColado(texto)
  if (!extraido.ok) return { ok: false, kind: 'format', motivo: extraido.motivo }

  const { dados } = extraido
  const lista = Array.isArray(dados) ? dados : (dados as { questoes?: unknown } | null)?.questoes
  if (Array.isArray(lista) && lista.length !== 1) {
    return { ok: false, kind: 'format', motivo: `Esperava 1 questão, mas vieram ${lista.length}.` }
  }
  return parseQuestionData(Array.isArray(lista) ? lista[0] : dados, alternativas, outras)
}
