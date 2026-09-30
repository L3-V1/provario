import { useState } from 'react'
import { testConnection, type ConnectionResult } from '../lib/gemini'
import { DEFAULT_SETTINGS, SETTINGS_KEY, type Settings } from '../lib/settings'
import { useStoredState } from '../lib/useStoredState'

export default function Configuracoes() {
  const [settings, setSettings] = useStoredState<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  const [draft, setDraft] = useState(settings.geminiApiKey)
  const [visible, setVisible] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<ConnectionResult | null>(null)

  const hasKey = settings.geminiApiKey !== ''

  function save() {
    setSettings({ ...settings, version: 1, geminiApiKey: draft.trim() })
    setDraft(draft.trim())
    setSaved(true)
    setResult(null)
  }

  function remove() {
    if (!window.confirm('Remover a chave salva neste navegador?')) return
    setSettings({ ...settings, version: 1, geminiApiKey: '' })
    setDraft('')
    setSaved(false)
    setResult(null)
  }

  async function test() {
    setTesting(true)
    setResult(null)
    setResult(await testConnection(settings.geminiApiKey))
    setTesting(false)
  }

  const btn = 'rounded px-4 py-2 text-sm font-semibold disabled:opacity-50'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <section className="space-y-3 rounded border border-slate-200 bg-white p-4">
        <label htmlFor="api-key" className="block font-semibold">
          Chave do Gemini
        </label>
        <div className="flex gap-2">
          <input
            id="api-key"
            type={visible ? 'text' : 'password'}
            value={draft}
            autoComplete="off"
            onChange={(e) => {
              setDraft(e.target.value)
              setSaved(false)
            }}
            className="min-w-0 flex-1 rounded border border-slate-400 px-3 py-2"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className={`${btn} border border-slate-400 text-slate-800`}
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={draft.trim() === ''}
            className={`${btn} bg-indigo-700 text-white`}
          >
            Salvar chave
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={!hasKey}
            className={`${btn} border border-red-700 text-red-800`}
          >
            Remover chave
          </button>
          <button
            type="button"
            onClick={test}
            disabled={!hasKey || testing}
            className={`${btn} border border-indigo-700 text-indigo-800`}
          >
            {testing ? 'Testando…' : 'Testar conexão'}
          </button>
        </div>
        {saved && (
          <p role="status" className="font-medium text-green-800">
            Chave salva
          </p>
        )}
        {result?.ok && (
          <p role="status" className="rounded bg-green-50 p-3 font-medium text-green-900">
            Conexão com o Gemini funcionando.
          </p>
        )}
        {result && !result.ok && (
          <p role="alert" className="rounded bg-red-50 p-3 font-medium text-red-900">
            {result.message}
          </p>
        )}
      </section>

      <section className="space-y-2 rounded border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Como criar sua chave</h2>
        <ol className="list-decimal space-y-1 pl-5 text-slate-800">
          <li>
            Acesse{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-indigo-800 underline"
            >
              aistudio.google.com/apikey
            </a>{' '}
            e entre com sua conta Google.
          </li>
          <li>Clique em “Criar chave de API”.</li>
          <li>Copie a chave gerada e cole no campo acima.</li>
          <li>Clique em “Salvar chave” e depois em “Testar conexão”.</li>
        </ol>
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-950">
          A chave fica salva somente neste navegador. Não use em computador compartilhado.
        </p>
      </section>
    </div>
  )
}
