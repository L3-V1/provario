import { Link } from 'react-router'
import { DEFAULT_SETTINGS, SETTINGS_KEY, type Settings } from '../lib/settings'
import { useStoredState } from '../lib/useStoredState'

export default function Inicio() {
  const [settings] = useStoredState<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bem-vinda ao Provario</h1>
      <p className="text-slate-700">
        Gere provas objetivas de Ciências com ajuda da inteligência artificial.
      </p>
      {!settings.geminiApiKey && (
        <div role="alert" className="rounded border border-amber-400 bg-amber-50 p-4 text-amber-950">
          Você ainda não configurou a chave do Gemini.{' '}
          <Link to="/configuracoes" className="font-semibold underline">
            Ir para Configurações
          </Link>
        </div>
      )}
    </div>
  )
}
