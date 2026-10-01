import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Aviso from '../components/Aviso'
import ConfirmDialog from '../components/ConfirmDialog'
import Icone from '../components/Icone'
import {
  DEFAULT_EXAMS,
  EXAMS_KEY,
  addExam,
  deleteExam,
  duplicateExam,
  listExams,
  sortExams,
  type Exam,
  type ExamsData,
} from '../lib/exams'
import { StorageQuotaError } from '../lib/storage'
import { useStoredState } from '../lib/useStoredState'

type Retorno = { tipo: 'sucesso' | 'erro'; texto: string }

const MSG_ARMAZENAMENTO_CHEIO =
  'Não foi possível duplicar a prova: o armazenamento do navegador está cheio. Libere espaço excluindo perfis ou provas antigas e tente de novo.'

const agoraIso = () => new Date().toISOString()
const dataBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

export default function Provas() {
  const [data, setData] = useStoredState<ExamsData>(EXAMS_KEY, DEFAULT_EXAMS)
  const navigate = useNavigate()
  const [retorno, setRetorno] = useState<Retorno | null>(null)
  const [excluindo, setExcluindo] = useState<Exam | null>(null)

  const provas = sortExams(listExams(data))

  function duplicar(prova: Exam) {
    const copia = duplicateExam(prova, agoraIso())
    try {
      setData(addExam(data, copia))
    } catch (err) {
      if (!(err instanceof StorageQuotaError)) throw err
      setRetorno({ tipo: 'erro', texto: MSG_ARMAZENAMENTO_CHEIO })
      return
    }
    navigate(`/provas/${copia.id}`, { state: { aviso: 'Cópia criada. Edite o título e as questões se quiser.' } })
  }

  function excluir() {
    if (!excluindo) return
    setData(deleteExam(data, excluindo.id))
    setExcluindo(null)
    setRetorno({ tipo: 'sucesso', texto: 'Prova excluída.' })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="titulo-pagina">
            <span>Provas</span>
          </h1>
          <Link to="/provas/nova" className="btn btn-primario">
            <Icone nome="mais" />
            Nova prova
          </Link>
        </div>
        <p className="max-w-[60ch] text-lg">
          Todas as provas geradas neste navegador. Abra uma para editar ou imprimir de novo.
        </p>
      </div>

      {retorno && <Aviso tipo={retorno.tipo}>{retorno.texto}</Aviso>}

      {provas.length === 0 ? (
        <section className="ficha">
          <div className="space-y-4 px-3 py-6 sm:px-5">
            <p className="font-display text-xl font-extrabold">Nenhuma prova salva ainda.</p>
            <p className="max-w-[60ch]">As provas que você gerar ficam guardadas aqui, prontas para abrir de novo.</p>
            <Link to="/provas/nova" className="btn btn-primario">
              <Icone nome="faisca" />
              Gerar primeira prova
            </Link>
          </div>
        </section>
      ) : (
        <ul className="space-y-6">
          {provas.map((p) => {
            const detalhes = [
              ['Série', p.params.serie],
              ['Turma(s)', p.params.turmas],
              ['Escola', p.perfil.escola],
              ['Perfil', p.perfil.nome],
              ['Gerada em', dataBr(p.criadoEm)],
              ...(dataBr(p.atualizadoEm) !== dataBr(p.criadoEm) ? [['Editada em', dataBr(p.atualizadoEm)]] : []),
            ].filter(([, valor]) => valor !== '')
            return (
              <li key={p.id} className="ficha">
                <div className="ficha-cabecalho">
                  <h2 className="text-xl font-extrabold wrap-break-word">{p.titulo}</h2>
                </div>
                <div className="space-y-5 px-3 py-5 sm:px-5">
                  <p className="line-clamp-2 wrap-break-word">{p.params.conteudo}</p>
                  <dl className="flex flex-wrap gap-x-6 gap-y-1 text-tinta-suave">
                    {detalhes.map(([rotulo, valor]) => (
                      <div key={rotulo} className="flex gap-1.5">
                        <dt className="font-bold">{rotulo}</dt>
                        <dd className="wrap-break-word">{valor}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex flex-wrap gap-3">
                    <Link to={`/provas/${p.id}`} aria-label={`Abrir ${p.titulo}`} className="btn btn-primario">
                      <Icone nome="lapis" />
                      Abrir
                    </Link>
                    <button
                      type="button"
                      onClick={() => duplicar(p)}
                      aria-label={`Duplicar ${p.titulo}`}
                      className="btn btn-secundario"
                    >
                      <Icone nome="copiar" />
                      Duplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => setExcluindo(p)}
                      aria-label={`Excluir ${p.titulo}`}
                      className="btn btn-perigo-contorno"
                    >
                      <Icone nome="lixeira" />
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        aberto={excluindo !== null}
        titulo={`Excluir a prova ${excluindo?.titulo ?? ''}?`}
        mensagem="A prova será apagada deste navegador. Essa ação não pode ser desfeita."
        rotuloConfirmar="Excluir"
        onConfirmar={excluir}
        onCancelar={() => setExcluindo(null)}
      />
    </div>
  )
}
