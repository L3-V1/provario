import { readItem, writeItem } from './storage'

export interface Settings {
  version: 1
  geminiApiKey: string
}

export const SETTINGS_KEY = 'settings'
export const DEFAULT_SETTINGS: Settings = { version: 1, geminiApiKey: '' }

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readItem<Partial<Settings>>(SETTINGS_KEY, {}) }
}

export function saveSettings(settings: Settings): void {
  writeItem(SETTINGS_KEY, settings)
}
