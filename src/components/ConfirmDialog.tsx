import { useEffect, useId, useRef } from 'react'

/**
 * Confirmação de ação destrutiva. Único componente de confirmação do app:
 * reutilize-o em vez de `window.confirm` ou de montar outro diálogo.
 */
export default function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar,
  onConfirmar,
  onCancelar,
}: {
  aberto: boolean
  titulo: string
  mensagem: string
  rotuloConfirmar: string
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const id = useId()
  const painel = useRef<HTMLDivElement>(null)
  const cancelar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    cancelar.current?.focus()
    return () => anterior?.focus()
  }, [aberto])

  if (!aberto) return null

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancelar()
      return
    }
    if (e.key !== 'Tab') return
    const botoes = painel.current?.querySelectorAll<HTMLButtonElement>('button')
    if (!botoes?.length) return
    const primeiro = botoes[0]
    const ultimo = botoes[botoes.length - 1]
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault()
      primeiro.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCancelar()}
    >
      <div
        ref={painel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-mensagem`}
        onKeyDown={onKeyDown}
        className="w-full max-w-md border-2 border-tinta bg-white shadow-relevo"
      >
        <div className="border-b-2 border-tinta border-t-8 border-t-caneta px-5 py-3">
          <h2 id={`${id}-titulo`} className="text-xl font-extrabold">
            {titulo}
          </h2>
        </div>
        <p id={`${id}-mensagem`} className="px-5 py-4">
          {mensagem}
        </p>
        <div className="flex flex-col-reverse gap-3 px-5 pb-5 sm:flex-row sm:justify-end">
          <button ref={cancelar} type="button" onClick={onCancelar} className="btn btn-secundario">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} className="btn btn-perigo">
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
