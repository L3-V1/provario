import { readItem } from './storage'

export interface Profile {
  id: string
  nome: string
  escola: string
  secretaria: string
  /** Data URL da logo, ou '' quando não houver. */
  logo: string
  professora: string
  anoLetivo: string
  /** ISO 8601 */
  criadoEm: string
  atualizadoEm: string
}

export interface ProfilesData {
  version: 1
  perfis: Profile[]
}

/** Campos editáveis no formulário; `id` só existe ao editar um perfil já salvo. */
export type ProfileDraft = Omit<Profile, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string }

export type ProfileErrors = { nome?: string; escola?: string }

export const PROFILES_KEY = 'profiles'
export const DEFAULT_PROFILES: ProfilesData = { version: 1, perfis: [] }

/** Lista de perfis de um valor lido do armazenamento, tolerando dado ausente ou corrompido. */
export function listProfiles(data: unknown): Profile[] {
  const perfis = (data as Partial<ProfilesData> | null)?.perfis
  return Array.isArray(perfis) ? perfis : []
}

export function sortProfiles(perfis: Profile[]): Profile[] {
  return [...perfis].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
}

export function getProfiles(): Profile[] {
  return sortProfiles(listProfiles(readItem<unknown>(PROFILES_KEY, DEFAULT_PROFILES)))
}

export function getProfile(id: string): Profile | undefined {
  return getProfiles().find((p) => p.id === id)
}

/** Rascunho de um perfil novo: ano atual e professora do perfil editado mais recentemente. */
export function emptyDraft(perfis: Profile[], agora = new Date()): ProfileDraft {
  const recente = perfis.reduce<Profile | undefined>(
    (acc, p) => (!acc || p.atualizadoEm > acc.atualizadoEm ? p : acc),
    undefined,
  )
  return {
    nome: '',
    escola: '',
    secretaria: '',
    logo: '',
    professora: recente?.professora ?? '',
    anoLetivo: String(agora.getFullYear()),
  }
}

export function validateProfile(draft: ProfileDraft): ProfileErrors {
  const erros: ProfileErrors = {}
  if (draft.nome.trim() === '') erros.nome = 'Informe o nome do perfil.'
  if (draft.escola.trim() === '') erros.escola = 'Informe o nome da escola.'
  return erros
}

export function normalize(draft: ProfileDraft): ProfileDraft {
  return {
    ...draft,
    nome: draft.nome.trim(),
    escola: draft.escola.trim(),
    secretaria: draft.secretaria.trim(),
    professora: draft.professora.trim(),
    anoLetivo: draft.anoLetivo.trim(),
  }
}

/** Cria o perfil (sem `id` ou com `id` desconhecido) ou atualiza o existente, sem duplicar. */
export function upsertProfile(data: ProfilesData, draft: ProfileDraft, agora: string): ProfilesData {
  const campos = normalize(draft)
  const perfis = listProfiles(data)
  const existente = perfis.find((p) => p.id === campos.id)
  if (existente) {
    const atualizado: Profile = { ...existente, ...campos, id: existente.id, atualizadoEm: agora }
    return { version: 1, perfis: perfis.map((p) => (p.id === existente.id ? atualizado : p)) }
  }
  const novo: Profile = { ...campos, id: crypto.randomUUID(), criadoEm: agora, atualizadoEm: agora }
  return { version: 1, perfis: [...perfis, novo] }
}

export function deleteProfile(data: ProfilesData, id: string): ProfilesData {
  return { version: 1, perfis: listProfiles(data).filter((p) => p.id !== id) }
}
