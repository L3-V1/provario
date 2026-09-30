import { useState } from 'react'
import Aviso from '../components/Aviso'
import ConfirmDialog from '../components/ConfirmDialog'
import Icone from '../components/Icone'
import { testConnection } from '../lib/gemini'
import { DEFAULT_SETTINGS, SETTINGS_KEY, type Settings } from '../lib/settings'
import { useStoredState } from '../lib/useStoredState'

type Retorno = { tipo: 'sucesso' | 'erro'; texto: string }

const passos = [
  <>
    Acesse{' '}
    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="link [overflow-wrap:anywhere]">
      aistudio.google.com/apikey
      <Icone nome="externo" className="ml-1 inline size-4 align-[-2px]" />
    </a>{' '}
    e entre com sua conta Google.
  </>,
  <>Clique em “Criar chave de API”.</>,
  <>Copie a chave gerada e cole no campo acima.</>,
  <>Clique em “Salvar chave” e depois em “Testar conexão”.</>,
]

export default function Configuracoes() {
  const [settings, setSettings] = useStoredState<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  const [draft, setDraft] = useState(settings.geminiApiKey)
  const [visible, setVisible] = useState(false)
  const [testing, setTesting] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [retorno, setRetorno] = useState<Retorno | null>(null)

  const hasKey = settings.geminiApiKey !== ''

  function save() {
    setSettings({ ...settings, version: 1, geminiApiKey: draft.trim() })
    setDraft(draft.trim())
    setRetorno({ tipo: 'sucesso', texto: 'Chave salva' })
  }

  function remove() {
    setConfirmando(false)
    setSettings({ ...settings, version: 1, geminiApiKey: '' })
    setDraft('')
    setRetorno({ tipo: 'sucesso', texto: 'Chave removida deste navegador.' })
  }

  async function test() {
    setTesting(true)
    setRetorno(null)
    const result = await testConnection(settings.geminiApiKey)
    setRetorno(
      result.ok
        ? { tipo: 'sucesso', texto: 'Conexão com o Gemini funcionando.' }
        : { tipo: 'erro', texto: result.message },
    )
    setTesting(false)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="titulo-pagina">
          <span>Configurações</span>
        </h1>
        <p className="max-w-[60ch] text-lg">
          O Provario usa o Gemini, do Google, para escrever as questões. Para isso, ele precisa de
          uma chave da sua conta.
        </p>
      </div>

      <section className="ficha">
        <div className="ficha-cabecalho">
          <label htmlFor="api-key" className="font-display text-xl font-extrabold">
            Chave do Gemini
          </label>
        </div>
        <div className="space-y-4 px-3 py-5 sm:px-5">
          <div className="flex gap-2">
            <input
              id="api-key"
              type={visible ? 'text' : 'password'}
              value={draft}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={draft.trim() === '' ? 'api-key-dica' : undefined}
              onChange={(e) => {
                setDraft(e.target.value)
                setRetorno(null)
              }}
              className="campo font-mono tracking-wide"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-pressed={visible}
              className="btn btn-secundario px-3"
            >
              <Icone nome={visible ? 'olhoFechado' : 'olho'} />
              <span className="max-sm:sr-only">{visible ? 'Ocultar' : 'Mostrar'}</span>
            </button>
          </div>
          {draft.trim() === '' && (
            <p id="api-key-dica" className="text-sm text-tinta-suave">
              Cole a chave para liberar o botão de salvar.
            </p>
          )}

          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button type="button" onClick={save} disabled={draft.trim() === ''} className="btn btn-primario">
              <Icone nome="salvar" />
              Salvar chave
            </button>
            <button
              type="button"
              onClick={test}
              disabled={!hasKey || testing}
              className="btn btn-secundario"
            >
              <Icone nome="conexao" />
              {testing ? 'Testando…' : 'Testar conexão'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              disabled={!hasKey}
              className="btn btn-perigo-contorno sm:ml-auto"
            >
              <Icone nome="lixeira" />
              Remover chave
            </button>
          </div>

          {retorno && <Aviso tipo={retorno.tipo}>{retorno.texto}</Aviso>}
        </div>
      </section>

      <section className="ficha">
        <div className="ficha-cabecalho">
          <h2 className="text-xl font-extrabold">Como criar sua chave</h2>
        </div>
        <div className="space-y-5 px-3 py-5 sm:px-5">
          <ol className="space-y-3">
            {passos.map((passo, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center border-2 border-tinta bg-marca-texto font-display font-black">
                  {i + 1}
                </span>
                <span className="min-w-0 pt-0.5">{passo}</span>
              </li>
            ))}
          </ol>
          <Aviso tipo="atencao" anunciar={false}>
            A chave fica salva somente neste navegador. Não use em computador compartilhado.
          </Aviso>
        </div>
      </section>

      <ConfirmDialog
        aberto={confirmando}
        titulo="Remover a chave do Gemini?"
        mensagem="A chave será apagada deste navegador. Para gerar provas de novo, você vai precisar colá-la outra vez."
        rotuloConfirmar="Remover"
        onConfirmar={remove}
        onCancelar={() => setConfirmando(false)}
      />
    </div>
  )
}
