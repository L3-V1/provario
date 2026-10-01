export const LOGO_MAX_BYTES = 5 * 1024 * 1024
/** Lado maior da logo guardada; ~3,4 cm a 300 dpi, suficiente para o cabeçalho impresso. */
export const LOGO_MAX_SIDE = 400

// SVG fica de fora: pode conter script e varia na rasterização.
const TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp']

export class LogoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LogoError'
  }
}

/** Reduz proporcionalmente para caber em `max` px no lado maior, sem ampliar. */
export function fitWithin(width: number, height: number, max: number) {
  const escala = Math.min(1, max / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * escala)),
    height: Math.max(1, Math.round(height * escala)),
  }
}

type Decodificada = { source: CanvasImageSource; width: number; height: number; liberar: () => void }

async function decodificar(file: File): Promise<Decodificada> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return { source: bitmap, width: bitmap.width, height: bitmap.height, liberar: () => bitmap.close() }
  }
  // Navegadores sem createImageBitmap.
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  await img.decode()
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, liberar: () => URL.revokeObjectURL(url) }
}

/** Valida, redimensiona e devolve a logo como data URL PNG (preserva transparência). */
export async function processLogo(file: File): Promise<string> {
  if (!TIPOS_ACEITOS.includes(file.type)) throw new LogoError('Formato não suportado. Use PNG, JPG ou WebP.')
  if (file.size > LOGO_MAX_BYTES) throw new LogoError('Imagem muito grande (máx. 5 MB).')

  try {
    const imagem = await decodificar(file)
    try {
      const { width, height } = fitWithin(imagem.width, imagem.height, LOGO_MAX_SIDE)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas indisponível')
      ctx.drawImage(imagem.source, 0, 0, width, height)
      return canvas.toDataURL('image/png')
    } finally {
      imagem.liberar()
    }
  } catch {
    throw new LogoError('Não foi possível ler a imagem.')
  }
}
