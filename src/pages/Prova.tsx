import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useLocation, useParams } from 'react-router'
import Aviso from '../components/Aviso'
import CampoTexto from '../components/CampoTexto'
import ConfirmDialog from '../components/ConfirmDialog'
import EditorProva from '../components/EditorProva'
import FolhaProva from '../components/FolhaProva'
import Icone from '../components/Icone'
import ModoManual from '../components/ModoManual'
import { idAlternativa, idCorreta, idEnunciado } from '../components/idsEditor'
import {
  colunasDaFolha,
  DEFAULT_EXAMS,
  EXAMS_KEY,
  listExams,
  normalizeQuestions,
  questionsEqual,
  removeQuestion,
  replaceQuestion,
  rotuloDificuldade,
  updateExam,
  validateQuestions,
  withColunas,
  withEdits,
  type ColunasFolha,
  type ExamsData,
  type Question,
  type QuestionErrors,
} from '../lib/exams'
import { buildManualQuestionPrompt } from '../lib/examPrompt'
import { parsePastedQuestion } from '../lib/examResponse'
import { regenerateQuestion } from '../lib/gemini'
import { DEFAULT_SETTINGS, SETTINGS_KEY, type Settings } from '../lib/settings'
import { readItem, StorageQuotaError, writeItem } from '../lib/storage'
import { useStoredState } from '../lib/useStoredState'

const MSG_ARMAZENAMENTO_CHEIO =
  'Não foi possível salvar as alterações: o armazenamento do navegador está cheio. Libere espaço excluindo perfis ou provas antigas e tente de novo.'

/** Id do primeiro campo com erro, na ordem em que aparecem na tela. */
function primeiroCampoComErro(erros: QuestionErrors): string | null {
  const i = Math.min(...Object.keys(erros).map(Number))
  const e = erros[i]
  if (!e) return null
  if (e.enunciado) return idEnunciado(i)
  const j = e.alternativas?.findIndex(Boolean) ?? -1
  if (j >= 0) return idAlternativa(i, j)
  if (e.repetidas) return idAlternativa(i, 0)
  return idCorreta(i)
}

const ID_TITULO = 'titulo-prova'

export default function Prova() {
  const { id } = useParams()
  const [data] = useStoredState<ExamsData>(EXAMS_KEY, DEFAULT_EXAMS)
  const [settings] = useStoredState<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  const location = useLocation()
  const aviso = (location.state as { aviso?: string } | null)?.aviso
  const prova = listExams(data).find((p) => p.id === id)
  const titulo = prova?.titulo
  const chave = settings.geminiApiKey.trim()

  // Rascunho: editar, excluir e regerar mexem só aqui; "Salvar alterações" grava tudo de uma vez.
  const [rascunho, setRascunho] = useState<Question[] | null>(null)
  const [tituloRascunho, setTituloRascunho] = useState('')
  const [erroTitulo, setErroTitulo] = useState<string | null>(null)
  const [erros, setErros] = useState<QuestionErrors>({})
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [erroColunas, setErroColunas] = useState<string | null>(null)
  const [regerando, setRegerando] = useState<number | null>(null)
  const [erroRegerar, setErroRegerar] = useState<{ indice: number; mensagem: string } | null>(null)
  // Questão com o painel do modo manual (copiar e colar) aberto.
  const [manualIndice, setManualIndice] = useState<number | null>(null)
  const [regerada, setRegerada] = useState<{ indice: number; anterior: Question } | null>(null)
  const [excluindo, setExcluindo] = useState<number | null>(null)
  const [descartando, setDescartando] = useState(false)

  const montado = useRef(true)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const editando = rascunho !== null
  const pendente =
    editando && !!prova && (tituloRascunho !== prova.titulo || !questionsEqual(rascunho, prova.questoes))
  const bloqueio = useBlocker(pendente)

  // O nome do arquivo ao "Salvar como PDF" vem do título do documento.
  useEffect(() => {
    if (!titulo) return
    document.title = titulo
    return () => {
      document.title = 'Provario'
    }
  }, [titulo])

  if (!prova) {
    return (
      <div className="space-y-4">
        <Aviso tipo="erro">Prova não encontrada. Ela pode ter sido apagada deste navegador.</Aviso>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/provas/nova" className="link">
            Gerar uma nova prova
          </Link>
          <Link to="/provas" className="link">
            Ver provas salvas
          </Link>
        </div>
      </div>
    )
  }

  const { params, perfil } = prova

  function editar() {
    setRascunho(prova!.questoes)
    setTituloRascunho(prova!.titulo)
    setErroTitulo(null)
    setErros({})
    setErroSalvar(null)
    setSalvo(false)
    setErroRegerar(null)
    setRegerada(null)
    setManualIndice(null)
  }

  function sairDaEdicao() {
    setRascunho(null)
    setErroTitulo(null)
    setErros({})
    setErroSalvar(null)
    setErroRegerar(null)
    setRegerada(null)
    setManualIndice(null)
    setDescartando(false)
  }

  function salvar() {
    if (!rascunho || regerando !== null) return
    const tituloNormalizado = tituloRascunho.trim()
    const questoes = normalizeQuestions(rascunho)
    const encontrados = validateQuestions(questoes)
    setErros(encontrados)
    setErroTitulo(tituloNormalizado === '' ? 'Informe o título da prova.' : null)
    setErroSalvar(null)
    if (tituloNormalizado === '') {
      document.getElementById(ID_TITULO)?.focus()
      return
    }
    if (Object.keys(encontrados).length > 0) {
      const campo = primeiroCampoComErro(encontrados)
      if (campo) document.getElementById(campo)?.focus()
      return
    }
    try {
      const atual = readItem(EXAMS_KEY, DEFAULT_EXAMS)
      writeItem<ExamsData>(
        EXAMS_KEY,
        updateExam(atual, withEdits(prova!, { titulo: tituloNormalizado, questoes })),
      )
    } catch (err) {
      if (!(err instanceof StorageQuotaError)) throw err
      setErroSalvar(MSG_ARMAZENAMENTO_CHEIO)
      return
    }
    sairDaEdicao()
    setSalvo(true)
  }

  function trocarColunas(colunas: ColunasFolha) {
    setErroColunas(null)
    try {
      const atual = readItem(EXAMS_KEY, DEFAULT_EXAMS)
      writeItem<ExamsData>(EXAMS_KEY, updateExam(atual, withColunas(prova!, colunas)))
    } catch (err) {
      if (!(err instanceof StorageQuotaError)) throw err
      setErroColunas(MSG_ARMAZENAMENTO_CHEIO)
    }
  }

  function alterar(i: number, questao: Question) {
    setRascunho((r) => (r ? replaceQuestion(r, i, questao) : r))
    setErros((e) => {
      if (!(i in e)) return e
      const { [i]: _, ...resto } = e
      return resto
    })
  }

  function excluir(i: number) {
    setRascunho((r) => (r ? removeQuestion(r, i) : r))
    setErros({})
    setRegerada(null)
    setExcluindo(null)
    setManualIndice(null)
  }

  async function regerar(i: number) {
    if (!rascunho || regerando !== null) return
    const anterior = rascunho[i]
    setErroRegerar(null)
    setRegerada(null)
    setManualIndice(null)
    setRegerando(i)
    const r = await regenerateQuestion(chave, prova!.params, rascunho.filter((_, j) => j !== i), anterior)
    if (!montado.current) return
    setRegerando(null)
    if (!r.ok) {
      setErroRegerar({ indice: i, mensagem: r.message })
      return
    }
    trocarQuestao(i, anterior, r.questao)
  }

  /** Põe a questão nova no rascunho, limpa os erros dela e guarda a anterior para o "Desfazer". */
  function trocarQuestao(i: number, anterior: Question, nova: Question) {
    setRascunho((atual) => (atual ? replaceQuestion(atual, i, nova) : atual))
    setErros((e) => {
      const { [i]: _, ...resto } = e
      return resto
    })
    setRegerada({ indice: i, anterior })
  }

  function abrirManual(i: number) {
    setErroRegerar(null)
    setRegerada(null)
    setManualIndice(i)
  }

  function aplicarManual(i: number, texto: string): string | null {
    if (!rascunho) return null
    const atual = rascunho[i]
    const r = parsePastedQuestion(texto, atual.alternativas.length, rascunho.filter((_, j) => j !== i))
    if (!r.ok) return r.motivo
    trocarQuestao(i, atual, r.questao)
    setManualIndice(null)
    document.getElementById(idEnunciado(i))?.focus()
    return null
  }

  function desfazer() {
    if (!regerada) return
    setRascunho((atual) => (atual ? replaceQuestion(atual, regerada.indice, regerada.anterior) : atual))
    setRegerada(null)
  }
  const detalhes = [
    ['Escola', perfil.escola],
    ['Professora', perfil.professora],
    ['Disciplina', params.disciplina],
    ['Série', params.serie],
    ['Turma(s)', params.turmas],
    ['Dificuldade', rotuloDificuldade(params.dificuldade)],
    ['Gerada em', new Date(prova.criadoEm).toLocaleDateString('pt-BR')],
  ].filter(([, valor]) => valor !== '')

  return (
    <div className="space-y-8">
      <div className="space-y-6 print:hidden">
        <div className="space-y-3">
          <h1 className="titulo-pagina">
            <span>{prova.titulo}</span>
          </h1>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-tinta-suave">
            {detalhes.map(([rotulo, valor]) => (
              <div key={rotulo} className="flex gap-1.5">
                <dt className="font-bold">{rotulo}:</dt>
                <dd className="wrap-break-word">{valor}</dd>
              </div>
            ))}
          </dl>
        </div>

        {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
        {salvo && <Aviso tipo="sucesso">Alterações salvas.</Aviso>}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {editando ? (
              <>
                <button
                  type="button"
                  className="btn btn-primario"
                  disabled={regerando !== null}
                  onClick={salvar}
                >
                  <Icone nome="salvar" />
                  Salvar alterações
                </button>
                <button
                  type="button"
                  className="btn btn-secundario"
                  disabled={regerando !== null}
                  onClick={() => (pendente ? setDescartando(true) : sairDaEdicao())}
                >
                  Descartar
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secundario"
                onClick={editar}
              >
                <Icone nome="lapis" />
                Editar prova
              </button>
            )}
            <button type="button" className="btn btn-primario" disabled={editando} onClick={() => window.print()}>
              <Icone nome="impressora" />
              Imprimir / Salvar PDF
            </button>
            <fieldset disabled={editando} className="flex items-center gap-2 disabled:opacity-50">
              <legend className="sr-only">Colunas da folha</legend>
              {([1, 2] as const).map((n) => (
                <label
                  key={n}
                  className="cursor-pointer border-2 border-tinta bg-white px-3 py-1.5 font-bold shadow-relevo-sm has-checked:bg-santos has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-santos"
                >
                  <input
                    type="radio"
                    name="colunas-folha"
                    className="sr-only"
                    checked={colunasDaFolha(prova) === n}
                    onChange={() => trocarColunas(n)}
                  />
                  {n === 1 ? '1 coluna' : '2 colunas'}
                </label>
              ))}
            </fieldset>
            <Link to="/provas/nova" className="btn btn-secundario">
              <Icone nome="faisca" />
              Gerar outra prova
            </Link>
          </div>
          {editando ? (
            <p className="text-tinta-suave">
              Salve as alterações para imprimir. Elas só valem na prova depois de salvas.
            </p>
          ) : (
            <p className="text-tinta-suave">
              Na janela de impressão, escolha 'Salvar como PDF' como destino e desmarque 'Cabeçalhos e rodapés'.
            </p>
          )}
        </div>

        {editando && !chave && (
          <Aviso tipo="atencao">
            Para regerar com o Gemini, configure a chave.{' '}
            <Link to="/configuracoes" className="link">
              Ir para Configurações
            </Link>{' '}
            Você também pode regerar com outra IA (copiar e colar).
          </Aviso>
        )}
        {erroColunas && <Aviso tipo="erro">{erroColunas}</Aviso>}
        {erroSalvar && <Aviso tipo="erro">{erroSalvar}</Aviso>}
        {erroRegerar && (
          <Aviso tipo="erro">
            {erroRegerar.mensagem}
            <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              Você pode tentar de novo ou regerar a questão {erroRegerar.indice + 1} com outra IA.
              <button type="button" className="link" onClick={() => abrirManual(erroRegerar.indice)}>
                Regerar com outra IA
              </button>
            </span>
          </Aviso>
        )}
        {regerando !== null && (
          <p role="status" className="font-semibold">
            Regerando…
          </p>
        )}
        {regerada && (
          <Aviso tipo="sucesso">
            <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
              Questão {regerada.indice + 1} regerada.
              <button type="button" className="link" onClick={desfazer}>
                Desfazer
              </button>
            </span>
          </Aviso>
        )}
      </div>

      {rascunho ? (
        <div className="space-y-6 print:hidden">
          <section className="ficha">
            <div className="ficha-cabecalho">
              <h2 className="text-xl font-extrabold">Título</h2>
            </div>
            <div className="px-3 py-5 sm:px-5">
              <CampoTexto
                id={ID_TITULO}
                rotulo="Título da prova"
                obrigatorio
                valor={tituloRascunho}
                erro={erroTitulo ?? undefined}
                onChange={(v) => {
                  setTituloRascunho(v)
                  setErroTitulo(null)
                }}
              />
            </div>
          </section>
          <EditorProva
            questoes={rascunho}
            erros={erros}
            regerando={regerando}
            podeRegerar={!!chave}
            onChange={alterar}
            onExcluir={setExcluindo}
            onRegerar={regerar}
            onRegerarManual={abrirManual}
            painel={
              manualIndice !== null && rascunho[manualIndice]
                ? {
                    indice: manualIndice,
                    conteudo: (
                      <ModoManual
                        key={manualIndice}
                        id={`manual-questao-${manualIndice}`}
                        titulo={`Regerar a questão ${manualIndice + 1} com outra IA`}
                        nivel={3}
                        prompt={buildManualQuestionPrompt(
                          params,
                          rascunho.filter((_, j) => j !== manualIndice),
                          rascunho[manualIndice],
                        )}
                        rotuloAplicar="Trocar questão"
                        onAplicar={(texto) => aplicarManual(manualIndice, texto)}
                        rotuloCancelar="Cancelar"
                        onCancelar={() => setManualIndice(null)}
                      />
                    ),
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <FolhaProva prova={prova} />
      )}

      <ConfirmDialog
        aberto={excluindo !== null}
        titulo="Excluir questão?"
        mensagem={`A questão ${(excluindo ?? 0) + 1} será removida e as seguintes serão renumeradas. Isso só vale na prova depois de salvar.`}
        rotuloConfirmar="Excluir questão"
        onConfirmar={() => excluindo !== null && excluir(excluindo)}
        onCancelar={() => setExcluindo(null)}
      />
      <ConfirmDialog
        aberto={descartando}
        titulo="Descartar alterações?"
        mensagem="As alterações feitas nesta edição, inclusive questões regeradas, serão perdidas."
        rotuloConfirmar="Descartar alterações"
        onConfirmar={sairDaEdicao}
        onCancelar={() => setDescartando(false)}
      />
      <ConfirmDialog
        aberto={bloqueio.state === 'blocked'}
        titulo="Sair sem salvar?"
        mensagem="Você tem alterações que ainda não foram salvas. Se sair agora, elas serão perdidas."
        rotuloConfirmar="Sair sem salvar"
        onConfirmar={() => bloqueio.state === 'blocked' && bloqueio.proceed()}
        onCancelar={() => bloqueio.state === 'blocked' && bloqueio.reset()}
      />
    </div>
  )
}
