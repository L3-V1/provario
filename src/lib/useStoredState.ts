import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { parseRaw, readRaw, removeItem, subscribe, writeItem } from './storage'

/**
 * Estado persistido no localStorage, sincronizado entre componentes e abas.
 * `fallback` deve ser uma referência estável (constante de módulo).
 */
export function useStoredState<T>(key: string, fallback: T) {
  const raw = useSyncExternalStore(
    useCallback((cb) => subscribe(key, cb), [key]),
    () => readRaw(key),
  )
  const value = useMemo(() => parseRaw(raw, fallback), [raw, fallback])
  const set = useCallback((next: T) => writeItem(key, next), [key])
  const clear = useCallback(() => removeItem(key), [key])
  return [value, set, clear] as const
}
