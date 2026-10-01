import { useRef, useState } from 'react'
import Aviso from '../components/Aviso'
import ConfirmDialog from '../components/ConfirmDialog'
import Icone from '../components/Icone'
import {
  applyBackup,
  backupFileName,
  createBackup,
  downloadJson,
  parseBackup,
  readCurrentData,
  restoreData,
  type Backup,
  type ModoImportacao,
  type ResumoMescla,
} from '../lib/backup'
import { DEFAULT_EXAMS, EXAMS_KEY, listExams } from '../lib/exams'
import { DEFAULT_PROFILES, PROFILES_KEY, listProfiles } from '../lib/profiles'
import { readItem, StorageQuotaError } from '../lib/storage'
import { testConnection } from '../lib/gemini'
import { DEFAULT_SETTINGS, SETTINGS_KEY, type Settings } from '../lib/settings'
import { useStoredState } from '../lib/useStoredState'

type Retorno = { tipo: 'sucesso' | 'erro'; texto: string }

const MSG_ARMAZENAMENTO_CHEIO =
  'Não foi possível importar: o armazenamento do navegador está cheio. Seus dados continuam como estavam. Libere espaço excluindo perfis ou provas antigas e tente de novo.'

const quantos = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
const perfisEProvas = (perfis: number, provas: number) =>
  `${quantos(perfis, 'perfil', 'perfis')} e ${quantos(provas, 'prova', 'provas')}`

function textoImportado(modo: ModoImportacao, perfis: ResumoMescla, provas: ResumoMescla): string {
  if (modo === 'substituir') return `Backup importado: ${perfisEProvas(perfis.novos, provas.novos)}.`
  return (
    `Backup importado. Perfis: ${quantos(perfis.novos, 'novo', 'novos')}, ${quantos(perfis.atualizados, 'atualizado', 'atualizados')}. ` +
    `Provas: ${quantos(provas.novos, 'nova', 'novas')}, ${quantos(provas.atualizados, 'atualizada', 'atualizadas')}.`
  )
}

function dataDoBackup(backup: Backup): string {
  const d = new Date(backup.exportadoEm)
  return Number.isNaN(d.getTime()) ? 'Backup' : `Backup de ${d.toLocaleDateString('pt-BR')}`
}

const passos = [
  <>
    Acesse{' '}
    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="link wrap-anywhere">
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
  const [retornoBackup, setRetornoBackup] = useState<Retorno | null>(null)
  const [pendente, setPendente] = useState<Backup | null>(null)
  const [substituindo, setSubstituindo] = useState(false)
  const entradaArquivo = useRef<HTMLInputElement>(null)

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
    if (result.ok) {
      setRetorno({ tipo: 'sucesso', texto: 'Conexão com o Gemini funcionando.' })
    } else {
      setRetorno({ tipo: 'erro', texto: (result as any).message })
    }
    setTesting(false)
  }

  function exportar() {
    const agora = new Date()
    const backup = createBackup(
      readItem<unknown>(PROFILES_KEY, DEFAULT_PROFILES),
      readItem<unknown>(EXAMS_KEY, DEFAULT_EXAMS),
      agora,
    )
    downloadJson(backupFileName(agora), backup)
    setPendente(null)
    setRetornoBackup({
      tipo: 'sucesso',
      texto: `Backup exportado: ${perfisEProvas(backup.perfis.length, backup.provas.length)}`,
    })
  }

  async function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!arquivo) return
    setPendente(null)
    setRetornoBackup(null)
    let texto: string
    try {
      texto = await arquivo.text()
    } catch {
      setRetornoBackup({ tipo: 'erro', texto: 'Não foi possível ler o arquivo.' })
      return
    }
    const r = parseBackup(texto)
    if (!r.ok) {
      setRetornoBackup({ tipo: 'erro', texto: r.message })
      return
    }
    setPendente(r.backup)
  }

  function importar(modo: ModoImportacao) {
    if (!pendente) return
    setSubstituindo(false)
    try {
      const r = applyBackup(modo, readCurrentData(), pendente)
      restoreData(r.dados)
      setRetornoBackup({ tipo: 'sucesso', texto: textoImportado(modo, r.resumo.perfis, r.resumo.provas) })
    } catch (err) {
      if (!(err instanceof StorageQuotaError)) throw err
      setRetornoBackup({ tipo: 'erro', texto: MSG_ARMAZENAMENTO_CHEIO })
    }
    setPendente(null)
  }

  const atuais = readCurrentData()
  const qtdAtuais = { perfis: listProfiles(atuais.perfis).length, provas: listExams(atuais.provas).length }

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

      <section className="ficha">
        <div className="ficha-cabecalho">
          <h2 className="text-xl font-extrabold">Backup dos dados</h2>
        </div>
        <div className="space-y-4 px-3 py-5 sm:px-5">
          <p className="max-w-[60ch]">
            O arquivo de backup guarda os perfis e as provas salvos neste navegador. A chave do Gemini não entra no
            arquivo, para que ele possa ser compartilhado com segurança. Faça um backup antes de limpar os dados do
            navegador ou de trocar de computador.
          </p>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <button type="button" onClick={exportar} className="btn btn-primario">
              <Icone nome="baixar" />
              Exportar backup
            </button>
            <button type="button" onClick={() => entradaArquivo.current?.click()} className="btn btn-secundario">
              <Icone nome="enviar" />
              Importar backup
            </button>
            <input
              ref={entradaArquivo}
              type="file"
              accept=".json,application/json"
              aria-label="Arquivo de backup"
              onChange={escolherArquivo}
              hidden
            />
          </div>

          {retornoBackup && <Aviso tipo={retornoBackup.tipo}>{retornoBackup.texto}</Aviso>}

          {pendente && (
            <div className="space-y-4 border-2 border-tinta p-4">
              <p className="font-bold">
                {dataDoBackup(pendente)} com {perfisEProvas(pendente.perfis.length, pendente.provas.length)}
              </p>
              <p>Como você quer trazer esses dados?</p>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <button type="button" onClick={() => importar('mesclar')} className="btn btn-primario">
                  Mesclar com os dados atuais
                </button>
                <button type="button" onClick={() => setSubstituindo(true)} className="btn btn-perigo-contorno">
                  Substituir tudo
                </button>
                <button type="button" onClick={() => setPendente(null)} className="btn btn-secundario">
                  Cancelar
                </button>
              </div>
              <p className="text-sm text-tinta-suave">
                Mesclar junta os itens pelo identificador; quando o mesmo item existe nos dois lados, fica a versão
                editada por último.
              </p>
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        aberto={substituindo}
        titulo="Substituir todos os dados?"
        mensagem={`Os ${perfisEProvas(qtdAtuais.perfis, qtdAtuais.provas)} atuais serão apagados e trocados pelo conteúdo do backup. Essa ação não pode ser desfeita.`}
        rotuloConfirmar="Substituir"
        onConfirmar={() => importar('substituir')}
        onCancelar={() => setSubstituindo(false)}
      />
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
