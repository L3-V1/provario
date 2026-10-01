import type { ExamParams, Question } from './exams'
import { buildExamPrompt, buildQuestionPrompt, examResponseSchema, questionResponseSchema } from './examPrompt'
import { parseExamResponse, parseQuestionResponse } from './examResponse'

// Modelo Flash estável mais recente confirmado em ai.google.dev/gemini-api/docs/models (30/09/2026).
export const GEMINI_MODEL = 'gemini-3.8-flash'
// Plano B quando o modelo principal segue sobrecarregado (503).
export const GEMINI_FALLBACK_MODEL = 'gemini-flash-latest'

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const TIMEOUT_MS = 45_000
const GENERATION_TIMEOUT_MS = 90_000
export const RETRY_DELAY_MS = 2_500

export type GeminiErrorKind =
  | 'invalid-key'
  | 'rate-limit'
  | 'overloaded'
  | 'unavailable'
  | 'network'
  | 'timeout'
  | 'missing-key'
  | 'invalid-response'
  | 'blocked'
  | 'unknown'

export type GeminiFailure = { ok: false; kind: GeminiErrorKind; message: string }

export type ConnectionResult = { ok: true } | GeminiFailure

function fail(kind: GeminiErrorKind, message: string): GeminiFailure {
  return { ok: false, kind, message }
}

async function apiMessage(res: Response): Promise<string> {
  try {
    const data = await res.clone().json()
    return String(data?.error?.message ?? '')
  } catch {
    return ''
  }
}

async function mapResponse(res: Response): Promise<GeminiFailure> {
  const { status } = res
  if (status === 400) {
    const detail = await apiMessage(res)
    if (detail.includes('API key not valid') || detail.includes('API_KEY_INVALID')) {
      return mapStatus(status)
    }
    return fail(
      'unknown',
      `O Gemini recusou a requisição (erro 400)${detail ? `: ${detail}` : '.'}`,
    )
  }
  return mapStatus(status)
}

function mapStatus(status: number): GeminiFailure {
  if (status === 400 || status === 401 || status === 403) {
    return fail(
      'invalid-key',
      'Chave inválida ou sem permissão. Confira se copiou a chave inteira.',
    )
  }
  if (status === 429) {
    return fail(
      'rate-limit',
      'Limite do plano gratuito atingido. Tente novamente em alguns minutos.',
    )
  }
  if (status === 503) {
    return fail(
      'overloaded',
      'O Gemini está sobrecarregado agora. Tente novamente em instantes.',
    )
  }
  if (status >= 500) {
    return fail('unavailable', 'O serviço do Gemini está indisponível no momento.')
  }
  return fail('unknown', `Não foi possível conectar ao Gemini (erro ${status}).`)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function post(
  model: string,
  apiKey: string,
  body: unknown,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Chama o Gemini. Em 503 (sobrecarga) tenta de novo uma vez no mesmo modelo
 * e, se persistir, passa ao modelo reserva. Outros erros voltam de imediato.
 * Devolve também o modelo que respondeu.
 */
export async function generateContent(
  apiKey: string,
  body: unknown,
  timeoutMs = TIMEOUT_MS,
): Promise<{ res: Response; modelo: string }> {
  let res!: Response
  let modelo = GEMINI_MODEL
  for (modelo of [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]) {
    res = await post(modelo, apiKey, body, timeoutMs)
    if (res.status !== 503) return { res, modelo }
    await sleep(RETRY_DELAY_MS)
    res = await post(modelo, apiKey, body, timeoutMs)
    if (res.status !== 503) return { res, modelo }
  }
  return { res, modelo }
}

/** Converte exceções de rede/timeout em resultado de falha. */
function mapError(err: unknown): GeminiFailure {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return fail('timeout', 'O Gemini demorou demais para responder. Tente novamente.')
  }
  if (err instanceof TypeError) {
    return fail('network', 'Sem conexão com a internet ou o Gemini está inacessível.')
  }
  return fail('unknown', 'Erro inesperado ao conectar ao Gemini.')
}

export async function testConnection(apiKey: string): Promise<ConnectionResult> {
  try {
    const { res } = await generateContent(apiKey, {
      contents: [{ parts: [{ text: 'Responda apenas: OK' }] }],
      generationConfig: { maxOutputTokens: 64 },
    })
    return res.ok ? { ok: true } : await mapResponse(res)
  } catch (err) {
    return mapError(err)
  }
}

export type ExamResult = { ok: true; questoes: Question[]; modelo: string } | GeminiFailure

const MSG_FORMATO =
  'A IA devolveu uma prova fora do formato esperado. Tente gerar de novo; se persistir, simplifique o conteúdo ou reduza a quantidade de questões.'
const MSG_BLOQUEIO =
  'O Gemini se recusou a gerar esse conteúdo. Reformule o conteúdo ou as observações.'

const MSG_SEM_CHAVE = 'Configure a chave do Gemini antes de gerar uma prova.'

type Validacao<T> =
  | { ok: true; valor: T }
  | { ok: false; kind: 'format' | 'blocked' | 'truncated' }

/** Chama o Gemini e valida a resposta. Fora do formato ganha uma nova tentativa automática; depois disso, erro. */
async function gerarValidado<T>(
  apiKey: string,
  body: unknown,
  validar: (corpo: unknown) => Validacao<T>,
): Promise<({ ok: true; valor: T; modelo: string }) | GeminiFailure> {
  if (!apiKey.trim()) return fail('missing-key', MSG_SEM_CHAVE)

  try {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      const { res, modelo } = await generateContent(apiKey, body, GENERATION_TIMEOUT_MS)
      if (!res.ok) return await mapResponse(res)
      const r = validar(await res.json().catch(() => null))
      if (r.ok) return { ok: true, valor: r.valor, modelo }
      if (r.kind === 'blocked') return fail('blocked', MSG_BLOQUEIO)
    }
    return fail('invalid-response', MSG_FORMATO)
  } catch (err) {
    return mapError(err)
  }
}

/** Gera a prova. Resposta fora do formato ganha uma nova tentativa automática; depois disso, erro. */
export async function generateExam(apiKey: string, params: ExamParams): Promise<ExamResult> {
  const body = {
    contents: [{ parts: [{ text: buildExamPrompt(params) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: examResponseSchema(params),
    },
  }
  const r = await gerarValidado(apiKey, body, (corpo) => {
    const p = parseExamResponse(corpo, params)
    return p.ok ? { ok: true, valor: p.questoes } : p
  })
  return r.ok ? { ok: true, questoes: r.valor, modelo: r.modelo } : r
}

export type QuestionResult = { ok: true; questao: Question; modelo: string } | GeminiFailure

const normalizar = (texto: string) => texto.trim().toLocaleLowerCase('pt-BR')

/**
 * Pede ao Gemini uma questão nova para ocupar o lugar de `atual`, com o mesmo número de alternativas.
 * Enunciado igual ao de outra questão da prova conta como resposta fora do formato.
 */
export async function regenerateQuestion(
  apiKey: string,
  params: ExamParams,
  outras: Question[],
  atual: Question,
): Promise<QuestionResult> {
  const alternativas = atual.alternativas.length
  const body = {
    contents: [{ parts: [{ text: buildQuestionPrompt(params, outras, atual) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: questionResponseSchema(alternativas),
    },
  }
  const existentes = new Set(outras.map((q) => normalizar(q.enunciado)))
  const r = await gerarValidado(apiKey, body, (corpo) => {
    const p = parseQuestionResponse(corpo, alternativas)
    if (!p.ok) return p
    if (existentes.has(normalizar(p.questao.enunciado))) return { ok: false, kind: 'format' }
    return { ok: true, valor: p.questao }
  })
  return r.ok ? { ok: true, questao: r.valor, modelo: r.modelo } : r
}
