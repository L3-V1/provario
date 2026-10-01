import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import Aviso from '../components/Aviso'
import FolhaProva from '../components/FolhaProva'
import Icone from '../components/Icone'
import {
  DEFAULT_EXAMS,
  EXAMS_KEY,
  listExams,
  rotuloDificuldade,
  type ExamsData,
} from '../lib/exams'
import { useStoredState } from '../lib/useStoredState'

export default function Prova() {
  const { id } = useParams()
  const [data] = useStoredState<ExamsData>(EXAMS_KEY, DEFAULT_EXAMS)
  const location = useLocation()
  const aviso = (location.state as { aviso?: string } | null)?.aviso
  const prova = listExams(data).find((p) => p.id === id)
  const titulo = prova?.titulo

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
        <Link to="/provas/nova" className="link">
          Gerar uma nova prova
        </Link>
      </div>
    )
  }

  const { params, perfil } = prova
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

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primario" onClick={() => window.print()}>
              <Icone nome="impressora" />
              Imprimir / Salvar PDF
            </button>
            <Link to="/provas/nova" className="btn btn-secundario">
              <Icone nome="faisca" />
              Gerar outra prova
            </Link>
          </div>
          <p className="text-tinta-suave">
            Na janela de impressão, escolha 'Salvar como PDF' como destino e desmarque 'Cabeçalhos e rodapés'.
          </p>
        </div>
      </div>

      <FolhaProva prova={prova} />
    </div>
  )
}
