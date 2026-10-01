import type { ExamParams, Question } from './exams'
import { buildExamPrompt, buildQuestionPrompt, examResponseSchema, questionResponseSchema } from './examPrompt'
import { parseExamResponse, parseQuestionResponse } from './examResponse'

// Modelo Flash estável mais recente confirmado em ai.google.dev/gemini-api/docs/models (30/09/2026).
export const GEMINI_MODEL = 'gemini-3.8-flash'
// Reserva quando o principal está sobrecarregado ou lento: o Flash-Lite estável mais recente
// confirmado em ai.google.dev/gemini-api/docs/models (01/10/2026).
export const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite'

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
/** Teto de uma geração, somando principal, reserva e a nova tentativa por formato. */
export const PRAZO_TOTAL_MS = 60_000
/** Tempo máximo do modelo principal; o resto fica para a reserva. */
export const PRAZO_PRINCIPAL_MS = 35_000
/** Abaixo disso não vale começar outra chamada (reserva ou nova tentativa). */
export const PRAZO_MINIMO_MS = 8_000
export const PRAZO_TESTE_MS = 20_000

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

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError'

/**
 * Chama o Gemini até `limite` (epoch ms). O principal tem até `PRAZO_PRINCIPAL_MS`; em sobrecarga,
 * limite de uso, erro do servidor ou timeout, passa ao Flash-Lite com o tempo que sobrar, se sobrar
 * pelo menos `PRAZO_MINIMO_MS`. Outros erros voltam de imediato. Devolve também o modelo que respondeu.
 */
export async function generateContent(
  apiKey: string,
  body: unknown,
  limite: number,
): Promise<{ res: Response; modelo: string }> {
  const restante = () => limite - Date.now()
  try {
    const res = await post(GEMINI_MODEL, apiKey, body, Math.min(PRAZO_PRINCIPAL_MS, restante()))
    const passarAdiante = res.status === 429 || res.status >= 500
    if (!passarAdiante || restante() < PRAZO_MINIMO_MS) return { res, modelo: GEMINI_MODEL }
  } catch (err) {
    if (!isAbort(err) || restante() < PRAZO_MINIMO_MS) throw err
  }
  return { res: await post(GEMINI_FALLBACK_MODEL, apiKey, body, restante()), modelo: GEMINI_FALLBACK_MODEL }
}

/** Converte exceções de rede/timeout em resultado de falha. */
function mapError(err: unknown): GeminiFailure {
  if (isAbort(err)) return fail('timeout', 'O Gemini não respondeu a tempo.')
  if (err instanceof TypeError) {
    return fail('network', 'Sem conexão com a internet ou o Gemini está inacessível.')
  }
  return fail('unknown', 'Erro inesperado ao conectar ao Gemini.')
}

export async function testConnection(apiKey: string): Promise<ConnectionResult> {
  try {
    const { res } = await generateContent(
      apiKey,
      {
        contents: [{ parts: [{ text: 'Responda apenas: OK' }] }],
        generationConfig: { maxOutputTokens: 64 },
      },
      Date.now() + PRAZO_TESTE_MS,
    )
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

/**
 * Chama o Gemini e valida a resposta, tudo dentro de `PRAZO_TOTAL_MS`. Fora do formato ganha uma
 * nova tentativa automática, se ainda houver tempo; depois disso, erro.
 */
async function gerarValidado<T>(
  apiKey: string,
  body: unknown,
  validar: (corpo: unknown) => Validacao<T>,
): Promise<({ ok: true; valor: T; modelo: string }) | GeminiFailure> {
  if (!apiKey.trim()) return fail('missing-key', MSG_SEM_CHAVE)

  const limite = Date.now() + PRAZO_TOTAL_MS
  try {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      if (tentativa > 0 && limite - Date.now() < PRAZO_MINIMO_MS) break
      const { res, modelo } = await generateContent(apiKey, body, limite)
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
  const r = await gerarValidado(apiKey, body, (corpo) => {
    const p = parseQuestionResponse(corpo, alternativas, outras)
    return p.ok ? { ok: true, valor: p.questao } : p
  })
  return r.ok ? { ok: true, questao: r.valor, modelo: r.modelo } : r
}
