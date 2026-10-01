import { Link, useLocation, useParams } from 'react-router'
import Aviso from '../components/Aviso'
import Icone from '../components/Icone'
import QuestaoView from '../components/QuestaoView'
import {
  DEFAULT_EXAMS,
  DIFICULDADES,
  EXAMS_KEY,
  listExams,
  type ExamsData,
} from '../lib/exams'
import { useStoredState } from '../lib/useStoredState'

const letra = (i: number) => String.fromCharCode(97 + i)

export default function Prova() {
  const { id } = useParams()
  const [data] = useStoredState<ExamsData>(EXAMS_KEY, DEFAULT_EXAMS)
  const location = useLocation()
  const aviso = (location.state as { aviso?: string } | null)?.aviso
  const prova = listExams(data).find((p) => p.id === id)

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
  const dificuldade = DIFICULDADES.find((d) => d.valor === params.dificuldade)?.rotulo ?? params.dificuldade
  const data_ = new Date(prova.criadoEm).toLocaleDateString('pt-BR')
  const detalhes = [
    ['Escola', perfil.escola],
    ['Professora', perfil.professora],
    ['Disciplina', params.disciplina],
    ['Série', params.serie],
    ['Turma(s)', params.turmas],
    ['Dificuldade', dificuldade],
    ['Gerada em', data_],
  ].filter(([, valor]) => valor !== '')

  return (
    <div className="space-y-8">
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

      <section aria-labelledby="questoes-titulo" className="ficha">
        <div className="ficha-cabecalho">
          <h2 id="questoes-titulo" className="text-xl font-extrabold">
            Questões
          </h2>
        </div>
        <ol className="space-y-6 px-3 py-5 sm:px-5">
          {prova.questoes.map((q, i) => (
            <li key={i}>
              <QuestaoView numero={i + 1} enunciado={q.enunciado} alternativas={q.alternativas} />
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="gabarito-titulo" className="ficha">
        <div className="ficha-cabecalho">
          <h2 id="gabarito-titulo" className="text-xl font-extrabold">
            Gabarito
          </h2>
        </div>
        <ul className="flex flex-wrap gap-x-8 gap-y-2 px-3 py-5 font-display font-bold sm:px-5">
          {prova.questoes.map((q, i) => (
            <li key={i}>
              {i + 1} – {letra(q.correta)}
            </li>
          ))}
        </ul>
      </section>

      <Link to="/provas/nova" className="btn btn-secundario">
        <Icone nome="faisca" />
        Gerar outra prova
      </Link>
    </div>
  )
}
