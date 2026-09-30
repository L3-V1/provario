// Modelo Flash estável mais recente confirmado em ai.google.dev/gemini-api/docs/models (30/09/2026).
export const GEMINI_MODEL = 'gemini-3.8-flash'
// Plano B quando o modelo principal segue sobrecarregado (503).
export const GEMINI_FALLBACK_MODEL = 'gemini-flash-latest'

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const TIMEOUT_MS = 45_000
export const RETRY_DELAY_MS = 2_500

export type GeminiErrorKind =
  | 'invalid-key'
  | 'rate-limit'
  | 'overloaded'
  | 'unavailable'
  | 'network'
  | 'timeout'
  | 'unknown'

export type ConnectionResult =
  | { ok: true }
  | { ok: false; kind: GeminiErrorKind; message: string }

function fail(kind: GeminiErrorKind, message: string): ConnectionResult {
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

async function mapResponse(res: Response): Promise<ConnectionResult> {
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

function mapStatus(status: number): ConnectionResult {
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

async function post(model: string, apiKey: string, body: unknown): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
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
 */
export async function generateContent(apiKey: string, body: unknown): Promise<Response> {
  let res!: Response
  for (const model of [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]) {
    res = await post(model, apiKey, body)
    if (res.status !== 503) return res
    await sleep(RETRY_DELAY_MS)
    res = await post(model, apiKey, body)
    if (res.status !== 503) return res
  }
  return res
}

export async function testConnection(apiKey: string): Promise<ConnectionResult> {
  try {
    const res = await generateContent(apiKey, {
      contents: [{ parts: [{ text: 'Responda apenas: OK' }] }],
      generationConfig: { maxOutputTokens: 64 },
    })
    return res.ok ? { ok: true } : await mapResponse(res)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return fail('timeout', 'O Gemini demorou demais para responder. Tente novamente.')
    }
    if (err instanceof TypeError) {
      return fail('network', 'Sem conexão com a internet ou o Gemini está inacessível.')
    }
    return fail('unknown', 'Erro inesperado ao conectar ao Gemini.')
  }
}
