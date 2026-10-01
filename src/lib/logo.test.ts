import { afterEach, describe, expect, it, vi } from 'vitest'
import { LOGO_MAX_BYTES, LOGO_MAX_SIDE, LogoError, fitWithin, processLogo } from './logo'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function arquivo(tipo: string, bytes = 10) {
  return new File([new Uint8Array(bytes)], 'logo', { type: tipo })
}

describe('fitWithin', () => {
  it('reduz proporcionalmente o lado maior para o máximo', () => {
    expect(fitWithin(800, 400, 400)).toEqual({ width: 400, height: 200 })
    expect(fitWithin(300, 1200, 400)).toEqual({ width: 100, height: 400 })
  })

  it('não amplia imagens pequenas', () => {
    expect(fitWithin(120, 80, 400)).toEqual({ width: 120, height: 80 })
  })

  it('nunca devolve lado zero', () => {
    expect(fitWithin(4000, 1, 400)).toEqual({ width: 400, height: 1 })
  })
})

describe('processLogo — validação', () => {
  it.each(['image/svg+xml', 'image/gif', 'application/pdf'])('rejeita %s', async (tipo) => {
    await expect(processLogo(arquivo(tipo))).rejects.toThrow('Formato não suportado. Use PNG, JPG ou WebP.')
    await expect(processLogo(arquivo(tipo))).rejects.toBeInstanceOf(LogoError)
  })

  it('rejeita arquivo acima de 5 MB', async () => {
    await expect(processLogo(arquivo('image/png', LOGO_MAX_BYTES + 1))).rejects.toThrow('Imagem muito grande (máx. 5 MB).')
  })
})

describe('processLogo — redimensionamento', () => {
  function simular(largura: number, altura: number) {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: largura, height: altura, close })))
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,QUJD')
    return { drawImage, toDataURL, close }
  }

  it('reduz para 400 px no lado maior e exporta PNG', async () => {
    const { drawImage, toDataURL, close } = simular(1600, 800)
    const url = await processLogo(arquivo('image/jpeg'))
    expect(url).toBe('data:image/png;base64,QUJD')
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, LOGO_MAX_SIDE, 200)
    expect(toDataURL).toHaveBeenCalledWith('image/png')
    expect(close).toHaveBeenCalled()
  })

  it('aceita WebP e PNG sem ampliar imagem pequena', async () => {
    const { drawImage } = simular(100, 50)
    await processLogo(arquivo('image/webp'))
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 50)
    await processLogo(arquivo('image/png'))
  })

  it('imagem que não decodifica vira mensagem clara', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => Promise.reject(new Error('corrompida'))))
    await expect(processLogo(arquivo('image/png'))).rejects.toThrow('Não foi possível ler a imagem.')
  })
})
