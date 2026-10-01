import { letraAlternativa, linhaIdentificacao, type Exam } from '../lib/exams'

/** Folha A4 da prova: cabeçalho institucional, questões e, em página separada, o gabarito. Só renderiza. */
export default function FolhaProva({ prova }: { prova: Exam }) {
  return (
    <div className="space-y-6 print:space-y-0">
      <article
        aria-label="Prova"
        className="border-2 border-tinta bg-white p-4 shadow-relevo-sm sm:p-8 print:border-0 print:p-0 print:shadow-none"
      >
        <CabecalhoProva prova={prova} />
        <h2 className="mt-6 text-center text-xl font-black tracking-wide break-after-avoid uppercase sm:text-2xl">
          {prova.titulo}
        </h2>
        <ol aria-label="Questões" className="mt-6 space-y-5">
          {prova.questoes.map((q, i) => (
            <li key={i} className="break-inside-avoid">
              <p className="font-semibold wrap-break-word">
                {i + 1}. {q.enunciado}
              </p>
              <ol className="mt-1.5 space-y-1">
                {q.alternativas.map((alt, j) => (
                  <li key={j} className="pl-6 -indent-6 wrap-break-word">
                    {letraAlternativa(j)}) {alt}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </article>

      <p className="text-sm text-tinta-suave print:hidden">Página do gabarito (sai numa página separada)</p>
      <GabaritoProva prova={prova} />
    </div>
  )
}

function CabecalhoProva({ prova }: { prova: Exam }) {
  const { perfil } = prova
  const identificacao = linhaIdentificacao(prova)
  return (
    <header className="border-2 border-tinta">
      <div className="flex items-center gap-4 p-3">
        {perfil.logo && (
          <img src={perfil.logo} alt="Logo da escola" className="h-16 w-auto max-w-28 shrink-0 object-contain" />
        )}
        <div className="min-w-0 flex-1">
          {perfil.secretaria && <p className="text-sm font-semibold wrap-break-word">{perfil.secretaria}</p>}
          <p className="text-lg leading-tight font-extrabold wrap-break-word">{perfil.escola}</p>
          <p className="mt-1 flex flex-wrap gap-x-2 text-sm">
            {identificacao.map((item, i) => (
              <span key={item} className="contents">
                {i > 0 && <span aria-hidden="true">·</span>}
                <span>{item}</span>
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="grid border-t-2 border-tinta sm:grid-cols-4">
        <Campo rotulo="Aluno(a)" className="sm:col-span-3" />
        <Campo rotulo="Nº" className="sm:border-l-2" />
        <Campo rotulo="Turma" className="border-t-2" />
        <Campo rotulo="Data" className="border-t-2 sm:border-l-2" />
        <Campo rotulo="Nota" className="border-t-2 sm:border-l-2" />
      </div>
    </header>
  )
}

function Campo({ rotulo, className = '' }: { rotulo: string; className?: string }) {
  return (
    <div className={`min-h-10 border-tinta px-2 pt-1 pb-3 text-sm font-semibold ${className}`}>
      <span>{rotulo}</span>
    </div>
  )
}

function GabaritoProva({ prova }: { prova: Exam }) {
  const subtitulo = [prova.perfil.escola, prova.params.serie, prova.params.turmas.trim()]
    .filter((x) => x !== '')
    .join(' · ')
  return (
    <section
      aria-labelledby="gabarito-titulo"
      className="border-2 border-tinta bg-white p-4 shadow-relevo-sm sm:p-8 print:border-0 print:p-0 print:shadow-none print:break-before-page"
    >
      <h2 id="gabarito-titulo" className="text-xl font-black wrap-break-word">
        Gabarito — {prova.titulo}
      </h2>
      <p className="mt-1 wrap-break-word">{subtitulo}</p>
      <ul className="mt-5 grid grid-cols-5 border-t-2 border-l-2 border-tinta">
        {prova.questoes.map((q, i) => (
          <li key={i} className="border-r-2 border-b-2 border-tinta px-2 py-1.5 text-center">
            <strong>{i + 1}</strong> – {letraAlternativa(q.correta)}
          </li>
        ))}
      </ul>
    </section>
  )
}
