import { NavLink, Outlet } from 'react-router'

// Cada seção do app é uma divisória do fichário; a aba ativa ganha o marca-texto.
const abas = [
  { to: '/', label: 'Início' },
  { to: '/configuracoes', label: 'Configurações' },
]

export default function Layout() {
  return (
    <div className="min-h-dvh px-3 py-4 sm:px-6 sm:py-8">
      <a
        href="#conteudo"
        className="btn btn-secundario sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50"
      >
        Pular para o conteúdo
      </a>

      <div className="mx-auto flex max-w-5xl flex-col md:flex-row">
        <nav
          aria-label="Principal"
          className="order-first -mb-0.5 flex gap-1.5 overflow-x-auto pl-8 sm:pl-10 md:order-last md:mb-0 md:-ml-0.5 md:flex-col md:gap-2 md:overflow-visible md:pt-36 md:pl-0"
        >
          {abas.map((a) => (
            <NavLink
              key={a.to}
              to={a.to}
              end
              className={({ isActive }) =>
                [
                  'relative border-2 border-tinta px-4 py-2.5 font-display font-bold whitespace-nowrap',
                  'border-b-0 md:border-b-2 md:border-l-0 md:py-3 md:pr-5',
                  isActive
                    ? 'z-10 bg-marca-texto text-tinta'
                    : 'bg-white text-tinta hover:underline hover:decoration-2 hover:underline-offset-4 md:shadow-relevo-sm',
                ].join(' ')
              }
            >
              {a.label}
            </NavLink>
          ))}
        </nav>

        <div className="folha relative min-w-0 flex-1">
          <div aria-hidden="true" className="furos absolute inset-y-0 left-0 w-7 sm:w-9" />

          <div className="pr-3 pl-12 sm:pr-8 sm:pl-20">
            <header className="border-b-4 border-double border-tinta pt-6 pb-4 sm:pt-8">
              <p className="font-display text-4xl leading-none font-black text-santos sm:text-5xl" style={{ fontStretch: '125%' }}>
                Provario
              </p>
              <p className="mt-2 text-tinta-suave">Provas objetivas de Ciências, prontas para imprimir.</p>
            </header>

            <main id="conteudo" tabIndex={-1} className="max-w-3xl py-8 outline-none sm:py-10">
              <Outlet />
            </main>

            <footer className="border-t-2 border-tinta py-4 text-sm text-tinta-suave">
              Tudo o que você salva fica neste navegador, sem conta e sem servidor.
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
