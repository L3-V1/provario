import {
  DEFAULT_EXAMS,
  DIFICULDADES,
  EXAMS_KEY,
  SERIES,
  listExams,
  validateQuestions,
  type Exam,
  type ExamsData,
} from './exams'
import { DEFAULT_PROFILES, PROFILES_KEY, listProfiles, type Profile, type ProfilesData } from './profiles'
import { readItem, readRaw, writeItem, writeRaw } from './storage'

export const BACKUP_VERSION = 1

/** Backup em arquivo: só perfis e provas. A chave do Gemini e os padrões do formulário ficam de fora. */
export interface Backup {
  app: 'provario'
  version: typeof BACKUP_VERSION
  /** ISO 8601 */
  exportadoEm: string
  perfis: Profile[]
  provas: Exam[]
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; message: string }

export type ModoImportacao = 'substituir' | 'mesclar'

export interface DadosAtuais {
  perfis: unknown
  provas: unknown
}

export interface DadosRestaurados {
  perfis: ProfilesData
  provas: ExamsData
}

export interface ResumoMescla {
  novos: number
  atualizados: number
}

export interface ResultadoImportacao {
  dados: DadosRestaurados
  resumo: { perfis: ResumoMescla; provas: ResumoMescla }
}

const MSG_NAO_E_BACKUP = 'O arquivo não é um backup do Provario.'

export function createBackup(perfisData: unknown, provasData: unknown, agora: Date): Backup {
  return {
    app: 'provario',
    version: BACKUP_VERSION,
    exportadoEm: agora.toISOString(),
    perfis: listProfiles(perfisData),
    provas: listExams(provasData),
  }
}

/** `provario-backup-AAAA-MM-DD.json`, com a data local. */
export function backupFileName(agora: Date): string {
  const dois = (n: number) => String(n).padStart(2, '0')
  return `provario-backup-${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}.json`
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function temTextos(o: Record<string, unknown>, campos: string[]): boolean {
  return campos.every((c) => typeof o[c] === 'string')
}

function isProfile(v: unknown): v is Profile {
  return (
    isRecord(v) &&
    temTextos(v, ['id', 'nome', 'escola', 'secretaria', 'logo', 'professora', 'anoLetivo', 'criadoEm', 'atualizadoEm'])
  )
}

function isQuestion(v: unknown): boolean {
  return (
    isRecord(v) &&
    typeof v.enunciado === 'string' &&
    Array.isArray(v.alternativas) &&
    v.alternativas.every((a) => typeof a === 'string') &&
    typeof v.correta === 'number' &&
    Number.isInteger(v.correta) &&
    v.correta >= 0 &&
    v.correta < v.alternativas.length
  )
}

function isExam(v: unknown): v is Exam {
  if (!isRecord(v) || !temTextos(v, ['id', 'titulo', 'modelo', 'criadoEm', 'atualizadoEm'])) return false
  const { params, perfil, questoes } = v
  if (
    !isRecord(params) ||
    !temTextos(params, ['perfilId', 'disciplina', 'turmas', 'conteudo', 'titulo', 'observacoes']) ||
    !SERIES.includes(params.serie as never) ||
    !DIFICULDADES.some((d) => d.valor === params.dificuldade) ||
    !Number.isInteger(params.quantidade) ||
    (params.alternativas !== 4 && params.alternativas !== 5)
  ) {
    return false
  }
  if (!isRecord(perfil) || !temTextos(perfil, ['id', 'nome', 'escola', 'secretaria', 'logo', 'professora', 'anoLetivo'])) {
    return false
  }
  if (!Array.isArray(questoes) || questoes.length === 0 || !questoes.every(isQuestion)) return false
  return Object.keys(validateQuestions(questoes)).length === 0
}

function temIdsRepetidos(itens: { id: string }[]): boolean {
  return new Set(itens.map((i) => i.id)).size !== itens.length
}

/** Valida o conteúdo de um arquivo de backup: aceita o arquivo inteiro ou recusa o arquivo inteiro. */
export function parseBackup(texto: string): ParseResult {
  let dado: unknown
  try {
    dado = JSON.parse(texto)
  } catch {
    return { ok: false, message: 'O arquivo não é um JSON válido.' }
  }
  if (!isRecord(dado) || dado.app !== 'provario' || !Number.isInteger(dado.version) || (dado.version as number) < 1) {
    return { ok: false, message: MSG_NAO_E_BACKUP }
  }
  if ((dado.version as number) > BACKUP_VERSION) {
    return {
      ok: false,
      message: 'Este backup foi feito por uma versão mais nova do Provario. Atualize o app e tente de novo.',
    }
  }
  if (!Array.isArray(dado.perfis) || !Array.isArray(dado.provas)) {
    return { ok: false, message: MSG_NAO_E_BACKUP }
  }

  const iPerfil = dado.perfis.findIndex((p) => !isProfile(p))
  if (iPerfil >= 0) return { ok: false, message: `O backup tem um perfil inválido (perfil ${iPerfil + 1}).` }
  const iProva = dado.provas.findIndex((p) => !isExam(p))
  if (iProva >= 0) return { ok: false, message: `O backup tem uma prova inválida (prova ${iProva + 1}).` }

  const perfis = dado.perfis as Profile[]
  const provas = dado.provas as Exam[]
  if (temIdsRepetidos(perfis)) return { ok: false, message: 'O backup tem perfis com o mesmo id.' }
  if (temIdsRepetidos(provas)) return { ok: false, message: 'O backup tem provas com o mesmo id.' }

  return {
    ok: true,
    backup: {
      app: 'provario',
      version: BACKUP_VERSION,
      exportadoEm: typeof dado.exportadoEm === 'string' ? dado.exportadoEm : '',
      perfis,
      provas,
    },
  }
}

/** Une os itens por `id`; em conflito fica o de `atualizadoEm` maior (no empate, o atual). */
export function mergeById<T extends { id: string; atualizadoEm: string }>(
  atuais: T[],
  importados: T[],
): { itens: T[] } & ResumoMescla {
  const itens = [...atuais]
  let novos = 0
  let atualizados = 0
  for (const novo of importados) {
    const i = itens.findIndex((a) => a.id === novo.id)
    if (i < 0) {
      itens.push(novo)
      novos++
    } else if (novo.atualizadoEm > itens[i].atualizadoEm) {
      itens[i] = novo
      atualizados++
    }
  }
  return { itens, novos, atualizados }
}

export function applyBackup(modo: ModoImportacao, atual: DadosAtuais, backup: Backup): ResultadoImportacao {
  const base = {
    perfis: modo === 'mesclar' ? listProfiles(atual.perfis) : [],
    provas: modo === 'mesclar' ? listExams(atual.provas) : [],
  }
  const perfis = mergeById(base.perfis, backup.perfis)
  const provas = mergeById(base.provas, backup.provas)
  return {
    dados: {
      perfis: { version: 1, perfis: perfis.itens },
      provas: { version: 1, provas: provas.itens },
    },
    resumo: {
      perfis: { novos: perfis.novos, atualizados: perfis.atualizados },
      provas: { novos: provas.novos, atualizados: provas.atualizados },
    },
  }
}

/** Grava perfis e depois provas; se as provas não couberem, devolve os perfis ao valor anterior e relança o erro. */
export function restoreData(dados: DadosRestaurados): void {
  const perfisAnteriores = readRaw(PROFILES_KEY)
  writeItem(PROFILES_KEY, dados.perfis)
  try {
    writeItem(EXAMS_KEY, dados.provas)
  } catch (err) {
    writeRaw(PROFILES_KEY, perfisAnteriores)
    throw err
  }
}

/** Dados atuais lidos do armazenamento, prontos para `applyBackup`. */
export function readCurrentData(): DadosAtuais {
  return {
    perfis: readItem<unknown>(PROFILES_KEY, DEFAULT_PROFILES),
    provas: readItem<unknown>(EXAMS_KEY, DEFAULT_EXAMS),
  }
}

/** Baixa `dados` como arquivo JSON sem indentação (as logos em base64 já deixam o arquivo grande). */
export function downloadJson(nome: string, dados: unknown): void {
  const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
