import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import Aviso from '../components/Aviso'
import CabecalhoPerfil from '../components/CabecalhoPerfil'
import CampoTexto from '../components/CampoTexto'
import Icone from '../components/Icone'
import { LogoError, processLogo } from '../lib/logo'
import {
  DEFAULT_PROFILES,
  PROFILES_KEY,
  emptyDraft,
  listProfiles,
  upsertProfile,
  validateProfile,
  type Profile,
  type ProfileDraft,
  type ProfileErrors,
  type ProfilesData,
} from '../lib/profiles'
import { StorageQuotaError } from '../lib/storage'
import { useStoredState } from '../lib/useStoredState'

function toDraft(p: Profile): ProfileDraft {
  const { id, nome, escola, secretaria, logo, professora, anoLetivo } = p
  return { id, nome, escola, secretaria, logo, professora, anoLetivo }
}

function Formulario({ inicial }: { inicial: ProfileDraft }) {
  const [data, setData] = useStoredState<ProfilesData>(PROFILES_KEY, DEFAULT_PROFILES)
  const navigate = useNavigate()
  const [draft, setDraft] = useState(inicial)
  const [erros, setErros] = useState<ProfileErrors>({})
  const [erroLogo, setErroLogo] = useState<string | null>(null)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [lendoLogo, setLendoLogo] = useState(false)

  const editando = inicial.id !== undefined

  function alterar(campo: keyof ProfileDraft, valor: string) {
    setDraft((d) => ({ ...d, [campo]: valor }))
    if (campo === 'nome' || campo === 'escola') setErros((e) => ({ ...e, [campo]: undefined }))
  }

  async function escolherLogo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!arquivo) return
    setErroLogo(null)
    setLendoLogo(true)
    try {
      const logo = await processLogo(arquivo)
      setDraft((d) => ({ ...d, logo }))
    } catch (err) {
      setErroLogo(err instanceof LogoError ? err.message : 'Não foi possível ler a imagem.')
    } finally {
      setLendoLogo(false)
    }
  }

  function salvar(e: FormEvent) {
    e.preventDefault()
    setErroSalvar(null)
    const encontrados = validateProfile(draft)
    setErros(encontrados)
    const primeiroInvalido = encontrados.nome ? 'perfil-nome' : encontrados.escola ? 'perfil-escola' : null
    if (primeiroInvalido) {
      document.getElementById(primeiroInvalido)?.focus()
      return
    }

    try {
      setData(upsertProfile(data, draft, new Date().toISOString()))
    } catch (err) {
      if (!(err instanceof StorageQuotaError)) throw err
      setErroSalvar(
        'Não foi possível salvar: o armazenamento do navegador está cheio. Exclua um perfil que não use mais ou escolha uma logo menor.',
      )
      return
    }
    navigate('/perfis', { state: { aviso: { tipo: 'sucesso', texto: 'Perfil salvo.' } } })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="titulo-pagina">
          <span>{editando ? 'Editar perfil' : 'Novo perfil'}</span>
        </h1>
        <p className="max-w-[60ch] text-lg">Só o nome do perfil e o da escola são obrigatórios.</p>
      </div>

      <form noValidate onSubmit={salvar} className="space-y-8">
        <section className="ficha">
          <div className="ficha-cabecalho">
            <h2 className="text-xl font-extrabold">Dados do perfil</h2>
          </div>
          <div className="space-y-5 px-3 py-5 sm:px-5">
            <CampoTexto
              id="perfil-nome"
              rotulo="Nome do perfil"
              obrigatorio
              valor={draft.nome}
              erro={erros.nome}
              onChange={(v) => alterar('nome', v)}
            />
            <CampoTexto
              id="perfil-escola"
              rotulo="Nome da escola"
              obrigatorio
              valor={draft.escola}
              erro={erros.escola}
              onChange={(v) => alterar('escola', v)}
            />
            <CampoTexto
              id="perfil-secretaria"
              rotulo="Secretaria ou rede"
              valor={draft.secretaria}
              onChange={(v) => alterar('secretaria', v)}
            />
            <CampoTexto
              id="perfil-professora"
              rotulo="Professora"
              valor={draft.professora}
              onChange={(v) => alterar('professora', v)}
            />
            <CampoTexto
              id="perfil-ano"
              rotulo="Ano letivo"
              valor={draft.anoLetivo}
              onChange={(v) => alterar('anoLetivo', v)}
            />

            <div className="space-y-2">
              <p className="font-bold">Logo da escola</p>
              <div className="flex flex-wrap items-center gap-3">
                {draft.logo && (
                  <img
                    src={draft.logo}
                    alt="Miniatura da logo"
                    className="size-16 border-2 border-tinta bg-white object-contain p-1"
                  />
                )}
                <input
                  id="perfil-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={escolherLogo}
                  className="peer sr-only"
                />
                <label
                  htmlFor="perfil-logo"
                  className="btn btn-secundario peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-santos"
                >
                  <Icone nome="imagem" />
                  {draft.logo ? 'Trocar logo' : 'Escolher logo'}
                </label>
                {draft.logo && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft((d) => ({ ...d, logo: '' }))
                      setErroLogo(null)
                    }}
                    className="btn btn-perigo-contorno"
                  >
                    <Icone nome="lixeira" />
                    Remover logo
                  </button>
                )}
              </div>
              <p className="text-sm text-tinta-suave">PNG, JPG ou WebP, até 5 MB. A imagem é reduzida automaticamente.</p>
              {erroLogo && <Aviso tipo="erro">{erroLogo}</Aviso>}
            </div>
          </div>
        </section>

        <section aria-labelledby="previa-titulo" className="ficha">
          <div className="ficha-cabecalho">
            <h2 id="previa-titulo" className="text-xl font-extrabold">
              Pré-visualização
            </h2>
          </div>
          <div className="px-3 py-5 sm:px-5">
            <CabecalhoPerfil perfil={draft} />
          </div>
        </section>

        {erroSalvar && <Aviso tipo="erro">{erroSalvar}</Aviso>}

        <div className="grid gap-3 sm:flex sm:flex-wrap">
          <button type="submit" disabled={lendoLogo} className="btn btn-primario">
            <Icone nome="salvar" />
            Salvar perfil
          </button>
          <Link to="/perfis" className="btn btn-secundario">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function PerfilForm() {
  const { id } = useParams()
  const [data] = useStoredState<ProfilesData>(PROFILES_KEY, DEFAULT_PROFILES)
  const perfis = listProfiles(data)
  const existente = id ? perfis.find((p) => p.id === id) : undefined

  if (id && !existente) {
    return (
      <div className="space-y-4">
        <Aviso tipo="erro">Perfil não encontrado. Ele pode ter sido excluído.</Aviso>
        <Link to="/perfis" className="link">
          Voltar para a lista de perfis
        </Link>
      </div>
    )
  }

  return <Formulario key={id ?? 'novo'} inicial={existente ? toDraft(existente) : emptyDraft(perfis)} />
}
