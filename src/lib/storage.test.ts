import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  StorageQuotaError,
  readItem,
  removeItem,
  subscribe,
  writeItem,
} from './storage'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('storage', () => {
  it('grava e lê um valor com o prefixo provario:', () => {
    writeItem('settings', { version: 1, a: 'x' })
    expect(readItem('settings', null)).toEqual({ version: 1, a: 'x' })
    expect(localStorage.getItem('provario:settings')).toBe('{"version":1,"a":"x"}')
  })

  it('devolve o padrão quando a chave não existe', () => {
    expect(readItem('nada', 'padrao')).toBe('padrao')
  })

  it('devolve o padrão quando o JSON está corrompido', () => {
    localStorage.setItem('provario:settings', '{quebrado')
    expect(readItem('settings', { ok: true })).toEqual({ ok: true })
  })

  it('devolve o padrão quando o localStorage lança erro na leitura', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(readItem('settings', 'padrao')).toBe('padrao')
  })

  it('removeItem apaga o valor', () => {
    writeItem('settings', 1)
    removeItem('settings')
    expect(localStorage.getItem('provario:settings')).toBeNull()
    expect(readItem('settings', 'padrao')).toBe('padrao')
  })

  it('lança StorageQuotaError quando setItem estoura a cota', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError')
    })
    expect(() => writeItem('settings', 1)).toThrow(StorageQuotaError)
  })

  it('subscribe é notificado na escrita e na remoção da chave observada', () => {
    const cb = vi.fn()
    const off = subscribe('settings', cb)
    writeItem('settings', 1)
    expect(cb).toHaveBeenCalledTimes(1)
    removeItem('settings')
    expect(cb).toHaveBeenCalledTimes(2)
    writeItem('outra', 1)
    expect(cb).toHaveBeenCalledTimes(2)
    off()
    writeItem('settings', 2)
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('subscribe é notificado por evento storage de outra aba', () => {
    const cb = vi.fn()
    const off = subscribe('settings', cb)
    window.dispatchEvent(new StorageEvent('storage', { key: 'provario:settings' }))
    expect(cb).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new StorageEvent('storage', { key: 'provario:outra' }))
    expect(cb).toHaveBeenCalledTimes(1)
    off()
  })
})
