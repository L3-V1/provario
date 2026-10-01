import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import Aviso from '../components/Aviso'
import CabecalhoPerfil from '../components/CabecalhoPerfil'
import ConfirmDialog from '../components/ConfirmDialog'
import Icone from '../components/Icone'
import {
  DEFAULT_PROFILES,
  PROFILES_KEY,
  deleteProfile,
  listProfiles,
  sortProfiles,
  type Profile,
  type ProfilesData,
} from '../lib/profiles'
import { useStoredState } from '../lib/useStoredState'

type Retorno = { tipo: 'sucesso' | 'erro'; texto: string }

export default function Perfis() {
  const [data, setData] = useStoredState<ProfilesData>(PROFILES_KEY, DEFAULT_PROFILES)
  const location = useLocation()
  // O formulário avisa o resultado do salvamento pelo state da navegação.
  const [retorno, setRetorno] = useState<Retorno | null>(
    () => (location.state as { aviso?: Retorno } | null)?.aviso ?? null,
  )
  const [excluindo, setExcluindo] = useState<Profile | null>(null)

  const perfis = sortProfiles(listProfiles(data))

  function excluir() {
    if (!excluindo) return
    setData(deleteProfile(data, excluindo.id))
    setExcluindo(null)
    setRetorno({ tipo: 'sucesso', texto: 'Perfil excluído.' })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="titulo-pagina">
            <span>Perfis</span>
          </h1>
          <Link to="/perfis/novo" className="btn btn-primario">
            <Icone nome="mais" />
            Novo perfil
          </Link>
        </div>
        <p className="max-w-[60ch] text-lg">
          Cada perfil reúne os dados de uma escola onde você dá aula. Na hora de montar a prova, você escolhe qual usar.
        </p>
      </div>

      {retorno && <Aviso tipo={retorno.tipo}>{retorno.texto}</Aviso>}

      {perfis.length === 0 ? (
        <section className="ficha">
          <div className="space-y-4 px-3 py-6 sm:px-5">
            <p className="font-display text-xl font-extrabold">Nenhum perfil cadastrado ainda.</p>
            <p className="max-w-[60ch]">
              Cadastre o nome da escola, a secretaria ou rede, a logo e o seu nome. Esses dados saem no cabeçalho das
              provas.
            </p>
            <Link to="/perfis/novo" className="btn btn-primario">
              <Icone nome="mais" />
              Cadastrar primeiro perfil
            </Link>
          </div>
        </section>
      ) : (
        <ul className="space-y-6">
          {perfis.map((p) => (
            <li key={p.id} className="ficha">
              <div className="ficha-cabecalho">
                <h2 className="text-xl font-extrabold wrap-break-word">{p.nome}</h2>
              </div>
              <div className="space-y-5 px-3 py-5 sm:px-5">
                <CabecalhoPerfil perfil={p} />
                <div className="flex flex-wrap gap-3">
                  <Link to={`/perfis/${p.id}`} aria-label={`Editar ${p.nome}`} className="btn btn-secundario">
                    <Icone nome="lapis" />
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => setExcluindo(p)}
                    aria-label={`Excluir ${p.nome}`}
                    className="btn btn-perigo-contorno"
                  >
                    <Icone nome="lixeira" />
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        aberto={excluindo !== null}
        titulo={`Excluir o perfil ${excluindo?.nome ?? ''}?`}
        mensagem="O perfil será apagado deste navegador. Essa ação não pode ser desfeita."
        rotuloConfirmar="Excluir"
        onConfirmar={excluir}
        onCancelar={() => setExcluindo(null)}
      />
    </div>
  )
}
