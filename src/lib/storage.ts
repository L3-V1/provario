const PREFIX = 'provario:'

export class StorageQuotaError extends Error {
  constructor() {
    super('Espaço de armazenamento do navegador esgotado.')
    this.name = 'StorageQuotaError'
  }
}

const listeners = new Map<string, Set<() => void>>()

function notify(key: string) {
  listeners.get(key)?.forEach((cb) => cb())
}

/** Valor bruto (string JSON) guardado; `null` se ausente ou inacessível. */
export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

export function parseRaw<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function readItem<T>(key: string, fallback: T): T {
  return parseRaw(readRaw(key), fallback)
}

export function writeItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new StorageQuotaError()
    }
    throw err
  }
  notify(key)
}

/** Regrava um valor bruto lido antes por `readRaw` (ou remove a chave, se era `null`), sem reserializar. */
export function writeRaw(key: string, raw: string | null): void {
  if (raw === null) {
    removeItem(key)
    return
  }
  try {
    localStorage.setItem(PREFIX + key, raw)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new StorageQuotaError()
    }
    throw err
  }
  notify(key)
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // armazenamento indisponível: nada a remover
  }
  notify(key)
}

export function subscribe(key: string, cb: () => void): () => void {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  set.add(cb)

  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === PREFIX + key) cb()
  }
  window.addEventListener('storage', onStorage)

  return () => {
    set.delete(cb)
    window.removeEventListener('storage', onStorage)
  }
}
