import type { Profile } from '../lib/profiles'
import Icone from './Icone'

type Campos = Pick<Profile, 'escola' | 'secretaria' | 'logo' | 'professora' | 'anoLetivo'>

/** Mini-cabeçalho institucional do perfil: logo, escola, secretaria, professora e ano. Campos vazios são omitidos. */
export default function CabecalhoPerfil({ perfil }: { perfil: Campos }) {
  const { escola, secretaria, logo, professora, anoLetivo } = perfil
  const detalhes = [professora, anoLetivo].filter((t) => t !== '')

  return (
    <div className="flex items-center gap-4">
      {logo ? (
        <img src={logo} alt="Logo da escola" className="size-20 shrink-0 border-2 border-tinta bg-white object-contain p-1" />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-20 shrink-0 place-items-center border-2 border-dashed border-tinta-suave text-tinta-suave"
        >
          <Icone nome="imagem" className="size-8" />
        </span>
      )}
      <div className="min-w-0 space-y-0.5">
        {escola && <p className="font-display text-xl leading-tight font-extrabold wrap-break-word">{escola}</p>}
        {secretaria && <p className="wrap-break-word">{secretaria}</p>}
        {detalhes.length > 0 && <p className="text-tinta-suave wrap-break-word">{detalhes.join(' · ')}</p>}
      </div>
    </div>
  )
}
