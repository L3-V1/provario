import type { ReactNode } from 'react'
import Icone, { type NomeIcone } from './Icone'

type Tipo = 'sucesso' | 'erro' | 'atencao'

const estilos: Record<Tipo, { caixa: string; selo: string; icone: NomeIcone; role: 'status' | 'alert' }> = {
  // Carimbo de "visto" da professora.
  sucesso: {
    caixa: 'border-santos bg-santos-claro text-santos-escuro',
    selo: 'bg-santos text-white',
    icone: 'check',
    role: 'status',
  },
  // Anotação em caneta vermelha.
  erro: {
    caixa: 'border-caneta bg-caneta-claro text-caneta-escura',
    selo: 'bg-caneta text-white',
    icone: 'erro',
    role: 'alert',
  },
  // Post-it colado na folha.
  atencao: {
    caixa: 'border-tinta bg-post-it text-tinta shadow-relevo-sm',
    selo: 'bg-marca-texto text-tinta border-r-2 border-tinta',
    icone: 'alerta',
    role: 'alert',
  },
}

/** Mensagem de retorno inline. `anunciar={false}` para avisos estáticos (sem role). */
export default function Aviso({
  tipo,
  children,
  anunciar = true,
}: {
  tipo: Tipo
  children: ReactNode
  anunciar?: boolean
}) {
  const e = estilos[tipo]
  return (
    <div role={anunciar ? e.role : undefined} className={`flex items-stretch border-2 ${e.caixa}`}>
      <span className={`flex w-8 shrink-0 sm:w-10 items-start justify-center pt-3 ${e.selo}`}>
        <Icone nome={e.icone} />
      </span>
      <div className="min-w-0 flex-1 px-3 py-2.5 font-semibold wrap-break-word">{children}</div>
    </div>
  )
}
