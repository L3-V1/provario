import { Link } from 'react-router'
import Aviso from '../components/Aviso'
import QuestaoView from '../components/QuestaoView'
import { DEFAULT_SETTINGS, SETTINGS_KEY, type Settings } from '../lib/settings'
import { useStoredState } from '../lib/useStoredState'

const alternativas = [
  'Ribossomo',
  'Mitocôndria',
  'Complexo golgiense',
  'Membrana plasmática',
  'Lisossomo',
]

export default function Inicio() {
  const [settings] = useStoredState<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="titulo-pagina">
          <span>Bem-vinda, professora</span>
        </h1>
        <p className="max-w-[60ch] text-lg">
          Você escolhe o conteúdo, a turma e a quantidade de questões. A IA escreve a prova e o
          gabarito, você revisa e imprime.
        </p>
      </div>

      {settings.geminiApiKey ? (
        <Aviso tipo="sucesso">
          A chave do Gemini está configurada. Tudo pronto para gerar provas.{' '}
          <Link to="/provas/nova" className="link">
            Gerar uma prova
          </Link>
        </Aviso>
      ) : (
        <Aviso tipo="atencao">
          Você ainda não configurou a chave do Gemini.{' '}
          <Link to="/configuracoes" className="link">
            Ir para Configurações
          </Link>
        </Aviso>
      )}

      <figure className="space-y-3">
        <div className="ficha relative">
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-b-2 border-tinta px-3 py-3 text-sm sm:px-5">
            <span className="basis-full font-display font-extrabold">Prova de Ciências, 7º ano</span>
            <Linha rotulo="Aluno" />
            <Linha rotulo="Nº" curta />
            <Linha rotulo="Nota" curta />
          </div>
          <div className="px-3 py-4 sm:px-5">
            <QuestaoView
              numero={1}
              enunciado="Qual organela celular é responsável pela respiração celular e pela produção da maior parte da energia da célula?"
              alternativas={alternativas}
            />
          </div>
        </div>
        <figcaption className="text-sm text-tinta-suave">
          Exemplo de questão. Na prova de verdade, o cabeçalho traz os dados da sua escola e o
          gabarito sai numa página separada.
        </figcaption>
      </figure>
    </div>
  )
}

function Linha({ rotulo, curta = false }: { rotulo: string; curta?: boolean }) {
  return (
    <span className={`flex items-end gap-2 ${curta ? 'min-w-24 flex-1 sm:flex-none' : 'basis-full sm:basis-0 sm:flex-1'}`}>
      <span className="font-bold">{rotulo}:</span>
      <span aria-hidden="true" className="mb-1 h-0 flex-1 border-b-2 border-dotted border-tinta-suave" />
    </span>
  )
}
