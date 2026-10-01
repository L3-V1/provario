import { useEffect, useRef, useState } from 'react'
import Aviso from './Aviso'
import CampoTexto from './CampoTexto'
import Icone from './Icone'

const CHATS = [
  { nome: 'ChatGPT', href: 'https://chatgpt.com' },
  { nome: 'Claude', href: 'https://claude.ai/new' },
  { nome: 'Gemini', href: 'https://gemini.google.com/app' },
]

/**
 * Modo manual: copiar o prompt, colar num chat de IA qualquer e colar a resposta de volta.
 * Só apresenta; guarda o texto colado, então um erro devolvido por `onAplicar` não apaga a caixa.
 */
export default function ModoManual({
  id,
  titulo,
  nivel = 2,
  prompt,
  rotuloAplicar,
  onAplicar,
  rotuloCancelar,
  onCancelar,
}: {
  id: string
  titulo: string
  /** Nível do título: 2 na página, 3 dentro do cartão de uma questão. */
  nivel?: 2 | 3
  prompt: string
  rotuloAplicar: string
  /** Devolve a mensagem de erro, ou `null` quando deu certo. */
  onAplicar: (texto: string) => string | null
  rotuloCancelar: string
  onCancelar: () => void
}) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [copia, setCopia] = useState<'ok' | 'falhou' | null>(null)
  const refTitulo = useRef<HTMLHeadingElement>(null)
  const refPrompt = useRef<HTMLTextAreaElement>(null)
  const Titulo = `h${nivel}` as const

  // Ao abrir, leva o foco ao painel, que aparece longe do botão que o abriu.
  useEffect(() => {
    refTitulo.current?.focus()
  }, [])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopia('ok')
    } catch {
      // Sem permissão ou fora de contexto seguro: deixa o texto selecionado para o Ctrl+C.
      setCopia('falhou')
      refPrompt.current?.focus()
      refPrompt.current?.select()
    }
  }

  function aplicar() {
    const mensagem = onAplicar(texto)
    setErro(mensagem)
    if (mensagem) document.getElementById(`${id}-resposta`)?.focus()
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className="ficha">
      <div className="ficha-cabecalho">
        <Titulo id={`${id}-titulo`} ref={refTitulo} tabIndex={-1} className="text-xl font-extrabold">
          {titulo}
        </Titulo>
      </div>
      <ol className="space-y-6 px-3 py-5 sm:px-5">
        <li className="space-y-2">
          <label htmlFor={`${id}-prompt`} className="block font-bold">
            Prompt
          </label>
          <p className="text-sm text-tinta-suave">1. Copie o prompt abaixo. Ele já traz as regras e o formato da resposta.</p>
          <textarea
            id={`${id}-prompt`}
            ref={refPrompt}
            readOnly
            rows={8}
            value={prompt}
            className="campo font-mono text-sm"
          />
          <button type="button" className="btn btn-secundario w-full sm:w-auto" onClick={copiar}>
            <Icone nome="copiar" />
            Copiar
          </button>
          {copia === 'ok' && <Aviso tipo="sucesso">Prompt copiado.</Aviso>}
          {copia === 'falhou' && <Aviso tipo="atencao">Selecione o texto e copie com Ctrl+C.</Aviso>}
        </li>

        <li className="space-y-2">
          <p className="font-bold">2. Cole o prompt num chat de IA e espere a resposta terminar</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {CHATS.map((c) => (
              <li key={c.nome}>
                <a href={c.href} target="_blank" rel="noopener noreferrer" className="link">
                  {c.nome}
                  <span className="sr-only"> (abre em nova aba)</span>
                  <Icone nome="externo" className="ml-1 inline size-4 align-[-2px]" />
                </a>
              </li>
            ))}
          </ul>
        </li>

        <li className="space-y-3">
          <p className="font-bold">3. Copie a resposta inteira do chat e cole aqui</p>
          <CampoTexto
            id={`${id}-resposta`}
            rotulo="Resposta da IA"
            tipo="textarea"
            linhas={8}
            valor={texto}
            erro={erro ?? undefined}
            onChange={(v) => {
              setTexto(v)
              setErro(null)
            }}
          />
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button type="button" className="btn btn-primario" onClick={aplicar}>
              <Icone nome="check" />
              {rotuloAplicar}
            </button>
            <button type="button" className="btn btn-secundario" onClick={onCancelar}>
              {rotuloCancelar}
            </button>
          </div>
        </li>
      </ol>
    </section>
  )
}
