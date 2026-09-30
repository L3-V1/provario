import { afterEach, describe, expect, it, vi } from 'vitest'
import { GEMINI_MODEL, testConnection } from './gemini'

function mockFetch(impl: typeof fetch) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('testConnection', () => {
  it('retorna ok em caso de sucesso', async () => {
    mockFetch(async () =>
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: 'OK' }] } }] }),
    )
    expect(await testConnection('minha-chave')).toEqual({ ok: true })
  })

  it('envia a chave no header x-goog-api-key e não na URL', async () => {
    const fn = mockFetch(async () => jsonResponse(200, {}))
    await testConnection('segredo123')
    const [url, init] = fn.mock.calls[0]
    expect(String(url)).toContain(`models/${GEMINI_MODEL}:generateContent`)
    expect(String(url)).not.toContain('segredo123')
    const headers = init!.headers as Record<string, string>
    expect(headers['x-goog-api-key']).toBe('segredo123')
    expect(init!.method).toBe('POST')
  })

  it('pede raciocínio mínimo e poucos tokens no teste de conexão', async () => {
    const fn = mockFetch(async () => jsonResponse(200, {}))
    await testConnection('x')
    const body = JSON.parse(fn.mock.calls[0][1]!.body as string)
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'minimal' })
    expect(body.generationConfig.maxOutputTokens).toBeLessThanOrEqual(64)
  })

  it('400 API_KEY_INVALID → chave inválida', async () => {
    mockFetch(async () =>
      jsonResponse(400, { error: { status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } }),
    )
    const r = await testConnection('x')
    expect(r).toMatchObject({ ok: false, kind: 'invalid-key' })
    expect(!r.ok && r.message).toContain('Chave inválida')
  })

  it('403 → chave inválida ou sem permissão', async () => {
    mockFetch(async () => jsonResponse(403, { error: {} }))
    expect(await testConnection('x')).toMatchObject({ ok: false, kind: 'invalid-key' })
  })

  it('401 → chave inválida ou sem permissão', async () => {
    mockFetch(async () => jsonResponse(401, { error: {} }))
    expect(await testConnection('x')).toMatchObject({ ok: false, kind: 'invalid-key' })
  })

  it('429 → limite do plano gratuito', async () => {
    mockFetch(async () => jsonResponse(429, { error: {} }))
    const r = await testConnection('x')
    expect(r).toMatchObject({ ok: false, kind: 'rate-limit' })
    expect(!r.ok && r.message).toContain('Limite do plano gratuito')
  })

  it('503 → serviço indisponível', async () => {
    mockFetch(async () => jsonResponse(503, { error: {} }))
    const r = await testConnection('x')
    expect(r).toMatchObject({ ok: false, kind: 'unavailable' })
    expect(!r.ok && r.message).toContain('indisponível')
  })

  it('falha de rede (TypeError) → sem conexão', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    const r = await testConnection('x')
    expect(r).toMatchObject({ ok: false, kind: 'network' })
    expect(!r.ok && r.message).toContain('Sem conexão')
  })

  it('timeout → mensagem própria', async () => {
    vi.useFakeTimers()
    mockFetch(
      (_url, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
        }),
    )
    const p = testConnection('x')
    await vi.advanceTimersByTimeAsync(46_000)
    const r = await p
    expect(r).toMatchObject({ ok: false, kind: 'timeout' })
  })

  it('outros status → mensagem genérica com o código', async () => {
    mockFetch(async () => jsonResponse(418, { error: {} }))
    const r = await testConnection('x')
    expect(r).toMatchObject({ ok: false, kind: 'unknown' })
    expect(!r.ok && r.message).toContain('418')
  })
})
