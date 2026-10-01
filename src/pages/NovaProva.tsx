import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import Aviso from '../components/Aviso'
import CampoTexto from '../components/CampoTexto'
import Icone from '../components/Icone'
import ModoManual from '../components/ModoManual'
import {
  DEFAULT_EXAMS,
  DIFICULDADES,
  EXAMS_KEY,
  EXAM_DEFAULTS_KEY,
  MODELO_MANUAL,
  SERIES,
  addExam,
  createExam,
  defaultTitle,
  initialParams,
  normalizeParams,
  rememberedParams,
  validateParams,
  type ExamParamErrors,
  type ExamParams,
  type ExamsData,
  type Question,
  type RememberedParams,
} from '../lib/exams'
import { buildManualExamPrompt } from '../lib/examPrompt'
import { parsePastedExam } from '../lib/examResponse'
import { generateExam } from '../lib/gemini'
import { DEFAULT_PROFILES, PROFILES_KEY, listProfiles, sortProfiles, type ProfilesData } from '../lib/profiles'
import { DEFAULT_SETTINGS, SETTINGS_KEY, type Settings } from '../lib/settings'
import { readItem, StorageQuotaError, writeItem } from '../lib/storage'
import { useStoredState } from '../lib/useStoredState'

const MSG_ARMAZENAMENTO_CHEIO =
  'Não foi possível salvar a prova: o armazenamento do navegador está cheio. Libere espaço excluindo perfis ou provas antigas e gere de novo.'

const ORDEM_CAMPOS: (keyof ExamParamErrors)[] = ['perfilId', 'disciplina', 'conteudo', 'quantidade']
const ID_CAMPO: Record<keyof ExamParamErrors, string> = {
  perfilId: 'prova-perfil',
  disciplina: 'prova-disciplina',
  conteudo: 'prova-conteudo',
  quantidade: 'prova-quantidade',
}

export default function NovaProva() {
  const [dadosPerfis] = useStoredState<ProfilesData>(PROFILES_KEY, DEFAULT_PROFILES)
  const [settings] = useStoredState<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  const perfis = sortProfiles(listProfiles(dadosPerfis))
  const chave = settings.geminiApiKey.trim()

  const navigate = useNavigate()
  const [draft, setDraft] = useState<ExamParams>(() =>
    initialParams(perfis, readItem<Partial<RememberedParams>>(EXAM_DEFAULTS_KEY, {})),
  )
  const [quantidadeTexto, setQuantidadeTexto] = useState(() => String(draft.quantidade))
  const [erros, setErros] = useState<ExamParamErrors>({})
  // `oferecerManual`: a falha foi do Gemini, então o aviso oferece o modo manual.
  const [erroGerar, setErroGerar] = useState<{ mensagem: string; oferecerManual: boolean } | null>(null)
  const [gerando, setGerando] = useState(false)
  // Parâmetros travados enquanto o painel do modo manual está aberto.
  const [manual, setManual] = useState<ExamParams | null>(null)

  // A prova é gravada mesmo que a professora saia da tela; só a navegação depende de continuar aqui.
  const montado = useRef(true)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  // Perfis carregados depois da montagem (ou excluídos em outra aba) mantêm a seleção coerente.
  const perfilId = perfis.some((p) => p.id === draft.perfilId) ? draft.perfilId : (perfis[0]?.id ?? '')

  function alterar<K extends keyof ExamParams>(campo: K, valor: ExamParams[K]) {
    setDraft((d) => ({ ...d, [campo]: valor }))
    if (campo in erros) setErros((e) => ({ ...e, [campo]: undefined }))
  }

  /** Valida o formulário; com erro, foca o primeiro campo e devolve `null`. */
  function validarFormulario(): ExamParams | null {
    const quantidade = quantidadeTexto.trim() === '' ? Number.NaN : Number(quantidadeTexto)
    const params = normalizeParams({ ...draft, perfilId, quantidade })
    const encontrados = validateParams(params, perfis)
    setErros(encontrados)
    const primeiro = ORDEM_CAMPOS.find((c) => encontrados[c])
    if (primeiro) {
      document.getElementById(ID_CAMPO[primeiro])?.focus()
      return null
    }
    return params
  }

  /** Grava a prova e abre; devolve a mensagem de erro se o armazenamento estiver cheio. */
  function salvarProva(params: ExamParams, questoes: Question[], modelo: string): string | null {
    const perfil = perfis.find((p) => p.id === params.perfilId)!
    const exam = createExam(params, perfil, questoes, modelo, new Date().toISOString())
    try {
      writeItem<ExamsData>(EXAMS_KEY, addExam(readItem(EXAMS_KEY, DEFAULT_EXAMS), exam))
    } catch (err) {
      if (!(err instanceof StorageQuotaError)) throw err
      return MSG_ARMAZENAMENTO_CHEIO
    }
    try {
      writeItem(EXAM_DEFAULTS_KEY, rememberedParams(params))
    } catch {
      // lembrar os parâmetros é só conveniência; a prova já está salva
    }
    if (montado.current) navigate(`/provas/${exam.id}`, { state: { aviso: 'Prova gerada e salva.' } })
    return null
  }

  async function gerar(e: FormEvent) {
    e.preventDefault()
    if (gerando || manual) return
    setErroGerar(null)
    const params = validarFormulario()
    if (!params) return

    setGerando(true)
    const r = await generateExam(chave, params)
    const erro = r.ok ? salvarProva(params, r.questoes, r.modelo) : null
    if (!montado.current) return
    if (!r.ok) setErroGerar({ mensagem: r.message, oferecerManual: true })
    else if (erro) setErroGerar({ mensagem: erro, oferecerManual: false })
    if (!r.ok || erro) setGerando(false)
  }

  function abrirManual() {
    if (gerando) return
    const params = validarFormulario()
    if (!params) return
    setErroGerar(null)
    setManual(params)
  }

  function aplicarManual(texto: string): string | null {
    if (!manual) return null
    const r = parsePastedExam(texto, manual)
    if (!r.ok) return r.motivo
    return salvarProva(manual, r.questoes, MODELO_MANUAL)
  }

  const semPerfis = perfis.length === 0
  const semChave = chave === ''
  const bloqueado = semPerfis || semChave || gerando

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="titulo-pagina">
          <span>Nova prova</span>
        </h1>
        <p className="max-w-[60ch] text-lg">
          Escolha o conteúdo e as características da prova. A IA escreve as questões e o gabarito.
        </p>
      </div>

      {semPerfis && (
        <Aviso tipo="atencao">
          Você ainda não tem perfil cadastrado.{' '}
          <Link to="/perfis/novo" className="link">
            Cadastrar um perfil
          </Link>
        </Aviso>
      )}
      {semChave && (
        <Aviso tipo="atencao">
          Você ainda não configurou a chave do Gemini.{' '}
          <Link to="/configuracoes" className="link">
            Ir para Configurações
          </Link>
          . Você também pode usar outra IA (copiar e colar), que funciona sem chave.
        </Aviso>
      )}

      <form noValidate onSubmit={gerar} className="space-y-8">
        <fieldset disabled={gerando || manual !== null} className="min-w-0">
          <section className="ficha">
            <div className="ficha-cabecalho">
              <h2 className="text-xl font-extrabold">Parâmetros da prova</h2>
            </div>
            <div className="space-y-5 px-3 py-5 sm:px-5">
              <div className="space-y-1.5">
                <label htmlFor="prova-perfil" className="block font-bold">
                  Perfil<span className="font-normal text-tinta-suave"> (obrigatório)</span>
                </label>
                <select
                  id="prova-perfil"
                  value={perfilId}
                  aria-invalid={erros.perfilId ? true : undefined}
                  aria-describedby={erros.perfilId ? 'prova-perfil-erro' : undefined}
                  onChange={(e) => alterar('perfilId', e.target.value)}
                  className="campo"
                >
                  {semPerfis && <option value="">Nenhum perfil cadastrado</option>}
                  {perfis.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                {erros.perfilId && (
                  <p id="prova-perfil-erro" className="font-semibold text-caneta-escura">
                    {erros.perfilId}
                  </p>
                )}
              </div>

              <CampoTexto
                id="prova-disciplina"
                rotulo="Disciplina"
                obrigatorio
                valor={draft.disciplina}
                erro={erros.disciplina}
                onChange={(v) => alterar('disciplina', v)}
              />

              <div className="space-y-1.5">
                <label htmlFor="prova-serie" className="block font-bold">
                  Série
                </label>
                <select
                  id="prova-serie"
                  value={draft.serie}
                  onChange={(e) => alterar('serie', e.target.value as ExamParams['serie'])}
                  className="campo"
                >
                  {SERIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <CampoTexto
                id="prova-turmas"
                rotulo="Turma(s)"
                valor={draft.turmas}
                placeholder="Ex.: 7º A, 7º B"
                onChange={(v) => alterar('turmas', v)}
              />

              <CampoTexto
                id="prova-conteudo"
                rotulo="Conteúdo"
                obrigatorio
                tipo="textarea"
                linhas={5}
                valor={draft.conteudo}
                erro={erros.conteudo}
                placeholder="Ex.: Organelas celulares e suas funções"
                onChange={(v) => alterar('conteudo', v)}
              />

              <CampoTexto
                id="prova-quantidade"
                rotulo="Quantidade de questões"
                obrigatorio
                tipo="number"
                min={1}
                max={20}
                valor={quantidadeTexto}
                erro={erros.quantidade}
                dica="De 1 a 20 questões."
                onChange={(v) => {
                  setQuantidadeTexto(v)
                  setErros((e) => ({ ...e, quantidade: undefined }))
                }}
              />

              <fieldset className="space-y-2">
                <legend className="font-bold">Alternativas por questão</legend>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {([4, 5] as const).map((n) => (
                    <label key={n} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="prova-alternativas"
                        checked={draft.alternativas === n}
                        onChange={() => alterar('alternativas', n)}
                        className="size-5 accent-santos"
                      />
                      {n} alternativas ({n === 4 ? 'a–d' : 'a–e'})
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="font-bold">Dificuldade</legend>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {DIFICULDADES.map((d) => (
                    <label key={d.valor} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="prova-dificuldade"
                        checked={draft.dificuldade === d.valor}
                        onChange={() => alterar('dificuldade', d.valor)}
                        className="size-5 accent-santos"
                      />
                      {d.rotulo}
                    </label>
                  ))}
                </div>
              </fieldset>

              <CampoTexto
                id="prova-titulo"
                rotulo="Título da prova"
                valor={draft.titulo}
                placeholder={defaultTitle(draft)}
                dica="Opcional. Se ficar vazio, usamos o título sugerido."
                onChange={(v) => alterar('titulo', v)}
              />

              <CampoTexto
                id="prova-observacoes"
                rotulo="Observações para a IA"
                tipo="textarea"
                linhas={3}
                valor={draft.observacoes}
                dica="Opcional. Ex.: use exemplos da nossa cidade, evite cálculos."
                onChange={(v) => alterar('observacoes', v)}
              />
            </div>
          </section>
        </fieldset>

        {erroGerar && (
          <Aviso tipo="erro">
            {erroGerar.mensagem}
            {erroGerar.oferecerManual && (
              <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                Você pode tentar de novo ou gerar com outra IA.
                <button type="button" className="link" onClick={abrirManual}>
                  Usar outra IA (copiar e colar)
                </button>
              </span>
            )}
          </Aviso>
        )}
        {gerando && (
          <p role="status" className="font-semibold">
            Isso pode levar até um minuto.
          </p>
        )}

        {manual ? (
          <ModoManual
            id="manual-prova"
            titulo="Gerar com outra IA (copiar e colar)"
            prompt={buildManualExamPrompt(manual)}
            rotuloAplicar="Montar prova"
            onAplicar={aplicarManual}
            rotuloCancelar="Voltar aos parâmetros"
            onCancelar={() => setManual(null)}
          />
        ) : (
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button type="submit" disabled={bloqueado} className="btn btn-primario">
              <Icone nome="faisca" />
              {gerando ? 'Gerando…' : 'Gerar prova'}
            </button>
            <button type="button" disabled={semPerfis || gerando} className="btn btn-secundario" onClick={abrirManual}>
              <Icone nome="copiar" />
              Usar outra IA (copiar e colar)
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
