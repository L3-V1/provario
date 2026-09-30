// Modelo Flash estável mais recente confirmado em ai.google.dev/gemini-api/docs/models (30/09/2026).
export const GEMINI_MODEL = 'gemini-3.8-flash'

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const TIMEOUT_MS = 45_000

export type GeminiErrorKind =
  | 'invalid-key'
  | 'rate-limit'
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
  if (status >= 500) {
    return fail('unavailable', 'O serviço do Gemini está indisponível no momento.')
  }
  return fail('unknown', `Não foi possível conectar ao Gemini (erro ${status}).`)
}

export async function generateContent(
  apiKey: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch(`${ENDPOINT}/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal,
  })
}

export async function testConnection(apiKey: string): Promise<ConnectionResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await generateContent(
      apiKey,
      {
        contents: [{ parts: [{ text: 'Responda apenas: OK' }] }],
        generationConfig: {
          maxOutputTokens: 64,
          thinkingConfig: { thinkingLevel: 'minimal' },
        },
      },
      controller.signal,
    )
    return res.ok ? { ok: true } : mapStatus(res.status)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return fail('timeout', 'O Gemini demorou demais para responder. Tente novamente.')
    }
    if (err instanceof TypeError) {
      return fail('network', 'Sem conexão com a internet ou o Gemini está inacessível.')
    }
    return fail('unknown', 'Erro inesperado ao conectar ao Gemini.')
  } finally {
    clearTimeout(timer)
  }
}
