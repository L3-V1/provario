import { letraAlternativa } from '../lib/exams'

/** Enunciado numerado e alternativas com letras (a, b, c…). */
export default function QuestaoView({
  numero,
  enunciado,
  alternativas,
}: {
  numero: number
  enunciado: string
  alternativas: string[]
}) {
  return (
    <div>
      <p className="font-semibold wrap-break-word">
        {numero}. {enunciado}
      </p>
      <ol className="mt-3 space-y-1.5">
        {alternativas.map((alt, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center border-2 border-tinta font-display text-sm font-bold">
              {letraAlternativa(i)}
            </span>
            <span className="min-w-0 pt-0.5 wrap-break-word">{alt}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
