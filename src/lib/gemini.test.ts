import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExamParams, Question } from './exams'
import { GEMINI_FALLBACK_MODEL, GEMINI_MODEL, RETRY_DELAY_MS, generateExam, regenerateQuestion, testConnection } from './gemini'

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

  it('400 API_KEY_INVALID → chave inválida', async () => {
    mockFetch(async () =>
      jsonResponse(400, { error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } }),
    )
    const r = await testConnection('x')
    expect(r).toMatchObject({ ok: false, kind: 'invalid-key' })
    if (!r.ok) expect((r as any).message).toContain('Chave inválida')
  })

  it('400 por outro motivo NÃO vira "chave inválida" e mostra o detalhe', async () => {
    mockFetch(async () =>
      jsonResponse(400, { error: { message: 'Parâmetro X não suportado', status: 'INVALID_ARGUMENT' } }),
    )
    const r = await testConnection('x')
    expect(r).toMatchObject({ ok: false, kind: 'unknown' })
    if (!r.ok) {
      expect((r as any).message).toContain('Parâmetro X não suportado')
      expect((r as any).message).not.toContain('Chave inválida')
    }
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
    if (!r.ok) expect((r as any).message).toContain('Limite do plano gratuito')
  })

  it('503 persistente → tenta 2x em cada modelo e mostra mensagem de sobrecarga', async () => {
    vi.useFakeTimers()
    const fn = mockFetch(async () => jsonResponse(503, { error: {} }))
    const p = testConnection('x')
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS * 2 + 100)
    const r = await p
    expect(r).toMatchObject({ ok: false, kind: 'overloaded' })
    if (!r.ok) expect((r as any).message).toContain('sobrecarregado')
    const urls = fn.mock.calls.map((c) => String(c[0]))
    expect(urls).toHaveLength(4)
    expect(urls[0]).toContain(GEMINI_MODEL)
    expect(urls[1]).toContain(GEMINI_MODEL)
    expect(urls[2]).toContain(GEMINI_FALLBACK_MODEL)
    expect(urls[3]).toContain(GEMINI_FALLBACK_MODEL)
  })

  it('503 e depois sucesso no retry do mesmo modelo → ok', async () => {
    vi.useFakeTimers()
    let n = 0
    const fn = mockFetch(async () => (n++ === 0 ? jsonResponse(503, {}) : jsonResponse(200, {})))
    const p = testConnection('x')
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS + 100)
    expect(await p).toEqual({ ok: true })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('503 no modelo principal e sucesso no reserva → ok', async () => {
    vi.useFakeTimers()
    const fn = mockFetch(async (url) =>
      String(url).includes(GEMINI_FALLBACK_MODEL) ? jsonResponse(200, {}) : jsonResponse(503, {}),
    )
    const p = testConnection('x')
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS * 2 + 100)
    expect(await p).toEqual({ ok: true })
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('500 → serviço indisponível, sem retry', async () => {
    const fn = mockFetch(async () => jsonResponse(500, { error: {} }))
    const r = await testConnection('x')
    expect(r).toMatchObject({ ok: false, kind: 'unavailable' })
    if (!r.ok) expect((r as any).message).toContain('indisponível')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('falha de rede (TypeError) → sem conexão', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    const r = await testConnection('x')
    expect(r).toMatchObject({ ok: false, kind: 'network' })
    if (!r.ok) expect((r as any).message).toContain('Sem conexão')
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
    if (!r.ok) expect((r as any).message).toContain('418')
  })
})

describe('generateExam', () => {
  const params: ExamParams = {
    perfilId: 'p1',
    disciplina: 'Ciências',
    serie: '7º ano',
    turmas: '',
    conteudo: 'Células',
    quantidade: 2,
    alternativas: 4,
    dificuldade: 'media',
    titulo: '',
    observacoes: '',
  }
  const questao = (correta = 'A') => ({
    enunciado: 'Pergunta?',
    alternativas: ['um', 'dois', 'três', 'quatro'],
    correta,
  })
  const valida = (extra: Record<string, unknown> = {}) =>
    jsonResponse(200, {
      candidates: [
        { content: { parts: [{ text: JSON.stringify({ questoes: [questao('A'), questao('C')] }) }] }, ...extra },
      ],
    })
  const invalida = () =>
    jsonResponse(200, { candidates: [{ content: { parts: [{ text: '{"questoes": []}' }] } }] })

  it('sem chave não chama a rede e devolve missing-key', async () => {
    const fn = mockFetch(async () => valida())
    const r = await generateExam('  ', params)
    expect(r).toMatchObject({ ok: false, kind: 'missing-key' })
    expect(fn).not.toHaveBeenCalled()
  })

  it('envia responseMimeType, responseSchema e a chave no header', async () => {
    const fn = mockFetch(async () => valida())
    const r = await generateExam('segredo123', params)
    expect(r).toMatchObject({ ok: true, modelo: GEMINI_MODEL })
    const [url, init] = fn.mock.calls[0]
    expect(String(url)).not.toContain('segredo123')
    expect((init!.headers as Record<string, string>)['x-goog-api-key']).toBe('segredo123')
    const corpo = JSON.parse(init!.body as string)
    expect(corpo.generationConfig.responseMimeType).toBe('application/json')
    expect(corpo.generationConfig.responseSchema.properties.questoes.minItems).toBe(2)
    expect(corpo.contents[0].parts[0].text).toContain('exatamente 2 questões')
  })

  it('devolve as questões validadas', async () => {
    mockFetch(async () => valida())
    const r = await generateExam('k', params)
    expect(r.ok && r.questoes.map((q) => q.correta)).toEqual([0, 2])
  })

  it('resposta fora do formato duas vezes → 2 chamadas e invalid-response', async () => {
    const fn = mockFetch(async () => invalida())
    const r = await generateExam('k', params)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(r).toMatchObject({ ok: false, kind: 'invalid-response' })
    if (!r.ok) expect(r.message).toContain('fora do formato esperado')
  })

  it('inválida e depois válida → ok', async () => {
    let n = 0
    const fn = mockFetch(async () => (n++ === 0 ? invalida() : valida()))
    const r = await generateExam('k', params)
    expect(r.ok).toBe(true)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('resposta cortada (MAX_TOKENS) também conta como fora do formato', async () => {
    const fn = mockFetch(async () => valida({ finishReason: 'MAX_TOKENS' }))
    const r = await generateExam('k', params)
    expect(r).toMatchObject({ ok: false, kind: 'invalid-response' })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('bloqueio → blocked, sem nova tentativa', async () => {
    const fn = mockFetch(async () => jsonResponse(200, { promptFeedback: { blockReason: 'SAFETY' } }))
    const r = await generateExam('k', params)
    expect(r).toMatchObject({ ok: false, kind: 'blocked' })
    if (!r.ok) expect(r.message).toContain('se recusou')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('429 → limite do plano gratuito, sem nova tentativa', async () => {
    const fn = mockFetch(async () => jsonResponse(429, { error: {} }))
    const r = await generateExam('k', params)
    expect(r).toMatchObject({ ok: false, kind: 'rate-limit' })
    if (!r.ok) expect(r.message).toContain('Limite do plano gratuito')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('400 chave inválida', async () => {
    mockFetch(async () => jsonResponse(400, { error: { message: 'API key not valid.' } }))
    expect(await generateExam('k', params)).toMatchObject({ ok: false, kind: 'invalid-key' })
  })

  it('falha de rede', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await generateExam('k', params)).toMatchObject({ ok: false, kind: 'network' })
  })

  it('timeout só ocorre depois de 90 s (45 s não basta)', async () => {
    vi.useFakeTimers()
    mockFetch(
      (_url, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
        }),
    )
    let resultado: unknown = null
    const p = generateExam('k', params).then((r) => (resultado = r))
    await vi.advanceTimersByTimeAsync(46_000)
    expect(resultado).toBeNull()
    await vi.advanceTimersByTimeAsync(45_000)
    await p
    expect(resultado).toMatchObject({ ok: false, kind: 'timeout' })
  })

  it('503 no modelo principal e sucesso no reserva grava o modelo reserva', async () => {
    vi.useFakeTimers()
    mockFetch(async (url) =>
      String(url).includes(GEMINI_FALLBACK_MODEL) ? valida() : jsonResponse(503, {}),
    )
    const p = generateExam('k', params)
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS * 2 + 100)
    expect(await p).toMatchObject({ ok: true, modelo: GEMINI_FALLBACK_MODEL })
  })
})

describe('regenerateQuestion', () => {
  const params: ExamParams = {
    perfilId: 'p1',
    disciplina: 'Ciências',
    serie: '7º ano',
    turmas: '',
    conteudo: 'Células',
    quantidade: 3,
    alternativas: 4,
    dificuldade: 'media',
    titulo: '',
    observacoes: '',
  }
  const outras: Question[] = [
    { enunciado: 'Primeira pergunta?', alternativas: ['a1', 'a2', 'a3', 'a4'], correta: 0 },
    { enunciado: 'Segunda pergunta?', alternativas: ['b1', 'b2', 'b3', 'b4'], correta: 1 },
  ]
  const atual: Question = { enunciado: 'Pergunta atual?', alternativas: ['c1', 'c2', 'c3', 'c4'], correta: 2 }

  const resposta = (q: unknown, extra: Record<string, unknown> = {}) =>
    jsonResponse(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(q) }] }, ...extra }] })
  const nova = (enunciado = 'Pergunta nova?', correta = 'D') => ({
    enunciado,
    alternativas: ['n1', 'n2', 'n3', 'n4'],
    correta,
  })

  it('sem chave não chama a rede e devolve missing-key', async () => {
    const fn = mockFetch(async () => resposta(nova()))
    expect(await regenerateQuestion(' ', params, outras, atual)).toMatchObject({ ok: false, kind: 'missing-key' })
    expect(fn).not.toHaveBeenCalled()
  })

  it('sucesso: devolve a questão com a letra convertida e o modelo', async () => {
    mockFetch(async () => resposta(nova()))
    const r = await regenerateQuestion('k', params, outras, atual)
    expect(r).toEqual({
      ok: true,
      modelo: GEMINI_MODEL,
      questao: { enunciado: 'Pergunta nova?', alternativas: ['n1', 'n2', 'n3', 'n4'], correta: 3 },
    })
  })

  it('envia prompt com as outras e a atual, e schema de uma questão', async () => {
    const fn = mockFetch(async () => resposta(nova()))
    await regenerateQuestion('segredo123', params, outras, atual)
    const [url, init] = fn.mock.calls[0]
    expect(String(url)).not.toContain('segredo123')
    expect((init!.headers as Record<string, string>)['x-goog-api-key']).toBe('segredo123')
    const corpo = JSON.parse(init!.body as string)
    const prompt = corpo.contents[0].parts[0].text as string
    for (const e of ['Primeira pergunta?', 'Segunda pergunta?', 'Pergunta atual?']) expect(prompt).toContain(e)
    expect(corpo.generationConfig.responseMimeType).toBe('application/json')
    expect(corpo.generationConfig.responseSchema.properties.correta.enum).toEqual(['A', 'B', 'C', 'D'])
  })

  it('usa o nº de alternativas da questão atual, não o dos parâmetros', async () => {
    const cinco: Question = { ...atual, alternativas: ['1', '2', '3', '4', '5'] }
    mockFetch(async () => resposta({ ...nova(), alternativas: ['n1', 'n2', 'n3', 'n4', 'n5'], correta: 'E' }))
    const r = await regenerateQuestion('k', params, outras, cinco)
    expect(r.ok && r.questao.alternativas).toHaveLength(5)
  })

  it('formato inválido e depois válido → ok em 2 chamadas', async () => {
    let n = 0
    const fn = mockFetch(async () => (n++ === 0 ? resposta({ enunciado: '' }) : resposta(nova())))
    expect(await regenerateQuestion('k', params, outras, atual)).toMatchObject({ ok: true })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('formato inválido duas vezes → invalid-response', async () => {
    const fn = mockFetch(async () => resposta({ enunciado: '' }))
    const r = await regenerateQuestion('k', params, outras, atual)
    expect(r).toMatchObject({ ok: false, kind: 'invalid-response' })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('enunciado igual ao de outra questão (ignorando caixa) conta como formato e tenta de novo', async () => {
    let n = 0
    const fn = mockFetch(async () =>
      resposta(n++ === 0 ? nova('  PRIMEIRA pergunta?') : nova('Outra pergunta totalmente nova?')),
    )
    const r = await regenerateQuestion('k', params, outras, atual)
    expect(r.ok && r.questao.enunciado).toBe('Outra pergunta totalmente nova?')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('duplicata persistente → invalid-response', async () => {
    mockFetch(async () => resposta(nova('Segunda pergunta?')))
    expect(await regenerateQuestion('k', params, outras, atual)).toMatchObject({ ok: false, kind: 'invalid-response' })
  })

  it('bloqueio → blocked, sem nova tentativa', async () => {
    const fn = mockFetch(async () => jsonResponse(200, { promptFeedback: { blockReason: 'SAFETY' } }))
    expect(await regenerateQuestion('k', params, outras, atual)).toMatchObject({ ok: false, kind: 'blocked' })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('429 → rate-limit, sem nova tentativa', async () => {
    const fn = mockFetch(async () => jsonResponse(429, { error: {} }))
    expect(await regenerateQuestion('k', params, outras, atual)).toMatchObject({ ok: false, kind: 'rate-limit' })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('falha de rede', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await regenerateQuestion('k', params, outras, atual)).toMatchObject({ ok: false, kind: 'network' })
  })

  it('timeout só depois de 90 s', async () => {
    vi.useFakeTimers()
    mockFetch(
      (_url, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    let resultado: unknown = null
    const p = regenerateQuestion('k', params, outras, atual).then((r) => (resultado = r))
    await vi.advanceTimersByTimeAsync(46_000)
    expect(resultado).toBeNull()
    await vi.advanceTimersByTimeAsync(45_000)
    await p
    expect(resultado).toMatchObject({ ok: false, kind: 'timeout' })
  })
})
