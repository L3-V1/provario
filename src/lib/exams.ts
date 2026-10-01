import { readItem } from './storage'
import { sortProfiles, type Profile } from './profiles'

export type Dificuldade = 'facil' | 'media' | 'dificil' | 'mista'
export type Serie = '6º ano' | '7º ano' | '8º ano' | '9º ano'

export const SERIES: Serie[] = ['6º ano', '7º ano', '8º ano', '9º ano']
export const DIFICULDADES: { valor: Dificuldade; rotulo: string }[] = [
  { valor: 'facil', rotulo: 'Fácil' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'dificil', rotulo: 'Difícil' },
  { valor: 'mista', rotulo: 'Mista' },
]

export interface ExamParams {
  perfilId: string
  disciplina: string
  serie: Serie
  turmas: string
  conteudo: string
  /** 1 a 20 */
  quantidade: number
  alternativas: 4 | 5
  dificuldade: Dificuldade
  titulo: string
  observacoes: string
}

export interface Question {
  enunciado: string
  alternativas: string[]
  /** Índice 0-based da alternativa correta; as letras são só apresentação. */
  correta: number
}

export interface Exam {
  id: string
  titulo: string
  params: ExamParams
  /** Cópia do perfil na hora da geração: editar ou excluir o perfil não altera a prova. */
  perfil: Omit<Profile, 'criadoEm' | 'atualizadoEm'>
  questoes: Question[]
  modelo: string
  /** ISO 8601 */
  criadoEm: string
  atualizadoEm: string
}

export interface ExamsData {
  version: 1
  provas: Exam[]
}

export type ExamParamErrors = Partial<
  Record<'perfilId' | 'disciplina' | 'conteudo' | 'quantidade', string>
>

/** Campos que voltam preenchidos na próxima visita; conteúdo, título e observações não. */
export type RememberedParams = Pick<
  ExamParams,
  'perfilId' | 'disciplina' | 'serie' | 'turmas' | 'quantidade' | 'alternativas' | 'dificuldade'
>

export const EXAMS_KEY = 'exams'
export const DEFAULT_EXAMS: ExamsData = { version: 1, provas: [] }
export const EXAM_DEFAULTS_KEY = 'exam-defaults'

export const QUANTIDADE_MIN = 1
export const QUANTIDADE_MAX = 20

/** Lista de provas de um valor lido do armazenamento, tolerando dado ausente ou corrompido. */
export function listExams(data: unknown): Exam[] {
  const provas = (data as Partial<ExamsData> | null | undefined)?.provas
  return Array.isArray(provas) ? provas : []
}

export function getExam(id: string): Exam | undefined {
  return listExams(readItem<unknown>(EXAMS_KEY, DEFAULT_EXAMS)).find((p) => p.id === id)
}

export function addExam(data: ExamsData, exam: Exam): ExamsData {
  return { version: 1, provas: [...listExams(data), exam] }
}

export function defaultTitle(p: Pick<ExamParams, 'disciplina' | 'serie'>): string {
  return `Avaliação de ${p.disciplina} — ${p.serie}`
}

/** Rascunho do formulário: padrões do app sobrepostos pelos parâmetros lembrados que ainda valem. */
export function initialParams(
  perfis: Profile[],
  lembrados: Partial<RememberedParams> | null | undefined,
): ExamParams {
  const r = lembrados ?? {}
  const ordenados = sortProfiles(perfis)
  const perfilId = ordenados.some((p) => p.id === r.perfilId) ? (r.perfilId as string) : (ordenados[0]?.id ?? '')
  return {
    perfilId,
    disciplina: typeof r.disciplina === 'string' && r.disciplina.trim() ? r.disciplina : 'Ciências',
    serie: SERIES.includes(r.serie as Serie) ? (r.serie as Serie) : '7º ano',
    turmas: typeof r.turmas === 'string' ? r.turmas : '',
    conteudo: '',
    quantidade: Number.isInteger(r.quantidade) && inRange(r.quantidade as number) ? (r.quantidade as number) : 10,
    alternativas: r.alternativas === 4 || r.alternativas === 5 ? r.alternativas : 4,
    dificuldade: DIFICULDADES.some((d) => d.valor === r.dificuldade) ? (r.dificuldade as Dificuldade) : 'media',
    titulo: '',
    observacoes: '',
  }
}

function inRange(n: number): boolean {
  return n >= QUANTIDADE_MIN && n <= QUANTIDADE_MAX
}

export function rememberedParams(p: ExamParams): RememberedParams {
  const { perfilId, disciplina, serie, turmas, quantidade, alternativas, dificuldade } = p
  return { perfilId, disciplina, serie, turmas, quantidade, alternativas, dificuldade }
}

export function validateParams(p: ExamParams, perfis: Profile[]): ExamParamErrors {
  const erros: ExamParamErrors = {}
  if (!perfis.some((x) => x.id === p.perfilId)) erros.perfilId = 'Escolha um perfil.'
  if (p.disciplina.trim() === '') erros.disciplina = 'Informe a disciplina.'
  if (p.conteudo.trim() === '') erros.conteudo = 'Descreva o conteúdo que a prova deve cobrir.'
  if (!Number.isInteger(p.quantidade) || !inRange(p.quantidade)) {
    erros.quantidade = `Informe um número inteiro de ${QUANTIDADE_MIN} a ${QUANTIDADE_MAX}.`
  }
  return erros
}

export function normalizeParams(p: ExamParams): ExamParams {
  return {
    ...p,
    disciplina: p.disciplina.trim(),
    turmas: p.turmas.trim(),
    conteudo: p.conteudo.trim(),
    titulo: p.titulo.trim(),
    observacoes: p.observacoes.trim(),
  }
}
