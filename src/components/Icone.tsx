// Ícones de traço reto (pontas quadradas), no mesmo peso das bordas da interface.
const paths = {
  check: <path d="M4 12.5 9.5 18 20 6.5" />,
  alerta: (
    <>
      <path d="M12 3 2.5 20.5h19Z" />
      <path d="M12 10v4.5M12 17.5v.5" />
    </>
  ),
  erro: (
    <>
      <path d="M3 3h18v18H3Z" />
      <path d="m8 8 8 8M16 8l-8 8" />
    </>
  ),
  olho: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <path d="M9.5 9.5h5v5h-5Z" />
    </>
  ),
  olhoFechado: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <path d="m4 20 16-16" />
    </>
  ),
  salvar: (
    <>
      <path d="M4 3h13l3 3v15H4Z" />
      <path d="M8 3v5h7V3M8 21v-7h8v7" />
    </>
  ),
  lixeira: (
    <>
      <path d="M3.5 6h17M9 6V3h6v3M5.5 6l1 15h11l1-15" />
      <path d="M10 10v7M14 10v7" />
    </>
  ),
  conexao: (
    <>
      <path d="M8 3v5M16 3v5M5 8h14v4a7 7 0 0 1-14 0Z" />
      <path d="M12 19v2.5" />
    </>
  ),
  externo: (
    <>
      <path d="M14 3h7v7M21 3l-9 9" />
      <path d="M18 14v7H3V6h7" />
    </>
  ),
  mais: <path d="M12 4v16M4 12h16" />,
  lapis: (
    <>
      <path d="m4 20 1-5L16 4l4 4L9 19Z" />
      <path d="m13 7 4 4" />
    </>
  ),
  imagem: (
    <>
      <path d="M3 4h18v16H3Z" />
      <path d="m3 17 5-5 4 4 3-3 6 6" />
      <path d="M8 7.5h2v2H8Z" />
    </>
  ),
} as const

export type NomeIcone = keyof typeof paths

export default function Icone({ nome, className = 'size-5' }: { nome: NomeIcone; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {paths[nome]}
    </svg>
  )
}
