import { letraAlternativa, type Question, type QuestionErrors } from '../lib/exams'
import CampoTexto from './CampoTexto'
import Icone from './Icone'

import { idAlternativa, idCorreta, idEnunciado } from './idsEditor'

/** Edição das questões de uma prova. Só apresenta o rascunho: quem decide o que fazer com ele é a página. */
export default function EditorProva({
  questoes,
  erros,
  regerando,
  podeRegerar,
  onChange,
  onExcluir,
  onRegerar,
}: {
  questoes: Question[]
  erros: QuestionErrors
  /** Índice da questão sendo regerada, ou `null`. */
  regerando: number | null
  podeRegerar: boolean
  onChange: (i: number, questao: Question) => void
  onExcluir: (i: number) => void
  onRegerar: (i: number) => void
}) {
  const ocupado = regerando !== null
  return (
    <fieldset disabled={ocupado} className="min-w-0 space-y-6">
      <legend className="sr-only">Questões da prova</legend>
      {questoes.map((q, i) => {
        const n = i + 1
        const erro = erros[i]
        return (
          <section key={i} aria-label={`Questão ${n}`} aria-busy={regerando === i ? true : undefined} className="ficha">
            <div className="ficha-cabecalho">
              <h2 className="text-xl font-extrabold">Questão {n}</h2>
            </div>
            <div className="space-y-5 px-3 py-5 sm:px-5">
              <CampoTexto
                id={idEnunciado(i)}
                rotulo={`Enunciado da questão ${n}`}
                tipo="textarea"
                linhas={3}
                valor={q.enunciado}
                erro={erro?.enunciado}
                onChange={(v) => onChange(i, { ...q, enunciado: v })}
              />

              <fieldset className="space-y-3">
                <legend className="font-bold">Alternativas</legend>
                <p className="text-sm text-tinta-suave">Marque a alternativa correta ao lado do texto dela.</p>
                {q.alternativas.map((alt, j) => {
                  const letra = letraAlternativa(j)
                  const erroAlt = erro?.alternativas?.[j]
                  return (
                    <div key={j} className="space-y-1">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <input
                          id={j === 0 ? idCorreta(i) : undefined}
                          type="radio"
                          name={`correta-${i}`}
                          checked={q.correta === j}
                          aria-label={`Marcar alternativa ${letra} como correta da questão ${n}`}
                          onChange={() => onChange(i, { ...q, correta: j })}
                          className="size-5 shrink-0 accent-santos"
                        />
                        <span aria-hidden="true" className="w-5 shrink-0 font-bold">
                          {letra})
                        </span>
                        <input
                          id={idAlternativa(i, j)}
                          type="text"
                          value={alt}
                          autoComplete="off"
                          aria-label={`Alternativa ${letra} da questão ${n}`}
                          aria-invalid={erroAlt || erro?.repetidas ? true : undefined}
                          aria-describedby={erroAlt ? `${idAlternativa(i, j)}-erro` : undefined}
                          onChange={(e) => {
                            const alternativas = q.alternativas.map((a, k) => (k === j ? e.target.value : a))
                            onChange(i, { ...q, alternativas })
                          }}
                          className="campo min-w-0 flex-1"
                        />
                      </div>
                      {erroAlt && (
                        <p id={`${idAlternativa(i, j)}-erro`} className="font-semibold text-caneta-escura">
                          {erroAlt}
                        </p>
                      )}
                    </div>
                  )
                })}
                {erro?.repetidas && <p className="font-semibold text-caneta-escura">{erro.repetidas}</p>}
                {erro?.correta && <p className="font-semibold text-caneta-escura">{erro.correta}</p>}
              </fieldset>

              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  className="btn btn-secundario"
                  disabled={!podeRegerar}
                  aria-label={`Regerar questão ${n}`}
                  onClick={() => onRegerar(i)}
                >
                  <Icone nome="faisca" />
                  Regerar questão
                </button>
                <button
                  type="button"
                  className="btn btn-perigo-contorno"
                  disabled={questoes.length <= 1}
                  aria-label={`Excluir questão ${n}`}
                  onClick={() => onExcluir(i)}
                >
                  <Icone nome="lixeira" />
                  Excluir questão
                </button>
              </div>
            </div>
          </section>
        )
      })}
    </fieldset>
  )
}
