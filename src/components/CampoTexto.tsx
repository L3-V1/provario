export default function CampoTexto({
  id,
  rotulo,
  obrigatorio = false,
  valor,
  erro,
  onChange,
  tipo = 'text',
  placeholder,
  linhas = 4,
  min,
  max,
  dica,
}: {
  id: string
  rotulo: string
  obrigatorio?: boolean
  valor: string
  erro?: string
  onChange: (valor: string) => void
  tipo?: 'text' | 'number' | 'textarea'
  placeholder?: string
  linhas?: number
  min?: number
  max?: number
  dica?: string
}) {
  const descricao = [erro ? `${id}-erro` : null, dica ? `${id}-dica` : null].filter(Boolean).join(' ') || undefined
  const comum = {
    id,
    value: valor,
    placeholder,
    autoComplete: 'off',
    'aria-invalid': erro ? (true as const) : undefined,
    'aria-describedby': descricao,
    className: 'campo',
  }
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-bold">
        {rotulo}
        {obrigatorio && <span className="font-normal text-tinta-suave"> (obrigatório)</span>}
      </label>
      {tipo === 'textarea' ? (
        <textarea {...comum} rows={linhas} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...comum}
          type={tipo}
          min={min}
          max={max}
          inputMode={tipo === 'number' ? 'numeric' : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {dica && (
        <p id={`${id}-dica`} className="text-sm text-tinta-suave">
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="font-semibold text-caneta-escura">
          {erro}
        </p>
      )}
    </div>
  )
}
