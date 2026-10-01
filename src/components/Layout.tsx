import { Link, Outlet, useLocation } from "react-router";
import brasao from "../images/brasao-cor-vertical.png";
import logoPms from "../images/logo-pms-bco.png";

// Cada seção do app é uma divisória do fichário; a ativa se emenda à folha e leva o grifo de marca-texto.
// `secao` é o prefixo cujas rotas também acendem a aba (ex.: /provas/:id acende "Nova prova").
const abas: { to: string; label: string; secao?: string }[] = [
  { to: "/", label: "Início" },
  { to: "/provas/nova", label: "Nova prova", secao: "/provas" },
  { to: "/perfis", label: "Perfis" },
  { to: "/configuracoes", label: "Configurações" },
];

export default function Layout() {
  const { pathname } = useLocation();
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
          {abas.map((a) => {
            const base = a.secao ?? a.to;
            const ativa =
              a.to === "/"
                ? pathname === "/"
                : pathname === base || pathname.startsWith(`${base}/`);
            return (
              <Link
                key={a.to}
                to={a.to}
                aria-current={ativa ? "page" : undefined}
                className={[
                  "relative border-2 border-tinta px-4 py-2.5 font-display font-bold whitespace-nowrap",
                  "border-b-0 md:border-b-2 md:border-l-0 md:py-3 md:pr-5",
                  ativa
                    ? "aba-ativa z-10 bg-folha text-tinta"
                    : "bg-aba-inativa text-tinta-suave hover:text-tinta hover:underline hover:decoration-2 hover:underline-offset-4",
                ].join(" ")}
              >
                <span>{a.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="folha relative min-w-0 flex-1">
          <div
            aria-hidden="true"
            className="furos absolute inset-y-0 left-0 w-7 sm:w-9"
          />

          <div className="pr-3 pl-12 sm:pr-8 sm:pl-20">
            <header className="flex items-end justify-between gap-4 border-b-4 border-double border-tinta pt-6 pb-4 sm:pt-8">
              <div>
                <p
                  className="font-display text-4xl leading-none font-black text-santos sm:text-5xl"
                  style={{ fontStretch: "125%" }}
                >
                  Provario
                </p>
                <p className="mt-2 text-tinta-suave">
                  Provas objetivas de Ciências, prontas para imprimir.
                </p>
              </div>
              <img
                src={brasao}
                alt="Prefeitura de Santos"
                className="h-16 w-auto shrink-0 sm:h-24"
              />
            </header>

            <main
              id="conteudo"
              tabIndex={-1}
              className="max-w-3xl py-8 outline-none sm:py-10"
            >
              <Outlet />
            </main>

            <footer className="border-t-2 border-tinta py-4 text-sm text-tinta-suave">
              Tudo o que você salva fica neste navegador, sem conta e sem
              servidor.
            </footer>
          </div>

          <div className="flex items-center justify-end border-t-2 border-tinta bg-tinta px-3 py-3 sm:px-8">
            <img
              src={logoPms}
              alt="Prefeitura de Santos"
              width={62}
              height={56}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
