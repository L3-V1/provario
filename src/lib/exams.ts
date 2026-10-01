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

/** `modelo` das provas montadas a partir da resposta colada de um chat de IA. */
export const MODELO_MANUAL = 'manual'

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

/** Substitui a prova de mesmo `id`; as outras ficam como estão. */
export function updateExam(data: ExamsData, exam: Exam): ExamsData {
  return { version: 1, provas: listExams(data).map((p) => (p.id === exam.id ? exam : p)) }
}

/** A prova com novo título e novas questões e `atualizadoEm` de agora. */
export function withEdits(exam: Exam, edits: { titulo: string; questoes: Question[] }): Exam {
  return { ...exam, titulo: edits.titulo, questoes: edits.questoes, atualizadoEm: new Date().toISOString() }
}

/** Provas da mais recente para a mais antiga (por `criadoEm`). */
export function sortExams(provas: Exam[]): Exam[] {
  return [...provas].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
}

export function deleteExam(data: ExamsData, id: string): ExamsData {
  return { version: 1, provas: listExams(data).filter((p) => p.id !== id) }
}

/** Cópia independente: id novo, título "… (cópia)", datas de `agora`; o snapshot do perfil é mantido. */
export function duplicateExam(exam: Exam, agora: string, id: string = crypto.randomUUID()): Exam {
  return {
    ...exam,
    id,
    titulo: `${exam.titulo} (cópia)`,
    params: { ...exam.params },
    perfil: { ...exam.perfil },
    questoes: exam.questoes.map((q) => ({ ...q, alternativas: [...q.alternativas] })),
    criadoEm: agora,
    atualizadoEm: agora,
  }
}

/** Prova nova com snapshot do perfil: editar ou excluir o perfil depois não a altera. */
export function createExam(
  params: ExamParams,
  perfil: Profile,
  questoes: Question[],
  modelo: string,
  agora: string,
  id: string = crypto.randomUUID(),
): Exam {
  const { id: perfilId, nome, escola, secretaria, logo, professora, anoLetivo } = perfil
  return {
    id,
    titulo: params.titulo || defaultTitle(params),
    params,
    perfil: { id: perfilId, nome, escola, secretaria, logo, professora, anoLetivo },
    questoes,
    modelo,
    criadoEm: agora,
    atualizadoEm: agora,
  }
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

/** Letra de apresentação da alternativa: 0 → 'a', 1 → 'b'… */
export function letraAlternativa(i: number): string {
  return String.fromCharCode(97 + i)
}

export function rotuloDificuldade(d: Dificuldade): string {
  return DIFICULDADES.find((x) => x.valor === d)?.rotulo ?? d
}

/** Itens não vazios da linha de identificação do cabeçalho: professora, disciplina, série e ano letivo. */
export function linhaIdentificacao(prova: Exam): string[] {
  const { perfil, params } = prova
  const professora = perfil.professora.trim()
  return [
    professora ? `Professora: ${professora}` : '',
    params.disciplina.trim(),
    params.serie,
    perfil.anoLetivo.trim(),
  ].filter((item) => item !== '')
}

export interface QuestionError {
  enunciado?: string
  /** Mensagem por alternativa vazia, na posição dela. */
  alternativas?: (string | undefined)[]
  repetidas?: string
  correta?: string
}

/** Erros por índice de questão; questões válidas não aparecem. */
export type QuestionErrors = Record<number, QuestionError>

export function validateQuestions(questoes: Question[]): QuestionErrors {
  const erros: QuestionErrors = {}
  questoes.forEach((q, i) => {
    const erro: QuestionError = {}
    if (q.enunciado.trim() === '') erro.enunciado = 'Escreva o enunciado.'

    const vazias = q.alternativas.map((a) => (a.trim() === '' ? 'Preencha esta alternativa.' : undefined))
    if (vazias.some(Boolean)) erro.alternativas = vazias

    const preenchidas = q.alternativas.map((a) => a.trim().toLocaleLowerCase('pt-BR')).filter((a) => a !== '')
    if (new Set(preenchidas).size !== preenchidas.length) erro.repetidas = 'Há alternativas repetidas.'

    if (!Number.isInteger(q.correta) || q.correta < 0 || q.correta >= q.alternativas.length) {
      erro.correta = 'Marque a alternativa correta.'
    }
    if (Object.keys(erro).length > 0) erros[i] = erro
  })
  return erros
}

export function normalizeQuestions(questoes: Question[]): Question[] {
  return questoes.map((q) => ({
    ...q,
    enunciado: q.enunciado.trim(),
    alternativas: q.alternativas.map((a) => a.trim()),
  }))
}

/** Remove a questão `i`; a prova nunca fica sem questões (devolve a mesma lista). A numeração é a posição. */
export function removeQuestion(questoes: Question[], i: number): Question[] {
  if (questoes.length <= 1) return questoes
  return questoes.filter((_, j) => j !== i)
}

export function replaceQuestion(questoes: Question[], i: number, questao: Question): Question[] {
  return questoes.map((q, j) => (j === i ? questao : q))
}

export function setCorreta(questoes: Question[], i: number, correta: number): Question[] {
  return questoes.map((q, j) => (j === i ? { ...q, correta } : q))
}

export function questionsEqual(a: Question[], b: Question[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (q, i) =>
        q.enunciado === b[i].enunciado &&
        q.correta === b[i].correta &&
        q.alternativas.length === b[i].alternativas.length &&
        q.alternativas.every((alt, j) => alt === b[i].alternativas[j]),
    )
  )
}
