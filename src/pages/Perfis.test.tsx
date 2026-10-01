import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LogoError, processLogo } from '../lib/logo'
import type { Profile, ProfilesData } from '../lib/profiles'
import { routes } from '../router'

vi.mock('../lib/logo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/logo')>()),
  processLogo: vi.fn(),
}))

const LOGO = 'data:image/png;base64,AAAA'

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

function perfil(over: Partial<Profile>): Profile {
  return {
    id: 'id-x',
    nome: 'Perfil',
    escola: 'Escola',
    secretaria: '',
    logo: '',
    professora: '',
    anoLetivo: '2026',
    criadoEm: '2026-01-01T10:00:00.000Z',
    atualizadoEm: '2026-01-01T10:00:00.000Z',
    ...over,
  }
}

function semear(...perfis: Partial<Profile>[]) {
  const data: ProfilesData = { version: 1, perfis: perfis.map(perfil) }
  localStorage.setItem('provario:profiles', JSON.stringify(data))
}

function salvos(): Profile[] {
  const raw = localStorage.getItem('provario:profiles')
  return raw ? (JSON.parse(raw) as ProfilesData).perfis : []
}

async function preencher(nome: string, escola: string) {
  await userEvent.type(screen.getByLabelText(/Nome do perfil/), nome)
  await userEvent.type(screen.getByLabelText(/Nome da escola/), escola)
}

beforeEach(() => {
  vi.mocked(processLogo).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Lista de perfis', () => {
  it('sem perfis, mostra o estado vazio com o botão de cadastro', () => {
    renderAt('/perfis')
    expect(screen.getByRole('heading', { name: 'Perfis' })).toBeInTheDocument()
    expect(screen.getByText(/Nenhum perfil cadastrado/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cadastrar primeiro perfil' })).toHaveAttribute('href', '/perfis/novo')
  })

  it('cadastra dois perfis, ambos aparecem e continuam lá depois de recarregar', async () => {
    renderAt('/perfis')
    await userEvent.click(screen.getByRole('link', { name: 'Cadastrar primeiro perfil' }))
    await preencher('Manhã', 'Escola Municipal Alfa')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
    expect(screen.getByRole('status')).toHaveTextContent('Perfil salvo.')

    await userEvent.click(screen.getByRole('link', { name: 'Novo perfil' }))
    await preencher('Tarde', 'Escola Municipal Beta')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    expect(screen.getByRole('heading', { name: 'Manhã' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tarde' })).toBeInTheDocument()

    cleanup() // recarregar a página
    renderAt('/perfis')
    expect(screen.getByRole('heading', { name: 'Manhã' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tarde' })).toBeInTheDocument()
    expect(screen.getByText('Escola Municipal Alfa')).toBeInTheDocument()
  })

  it('lista em ordem alfabética', () => {
    semear({ id: 'a', nome: 'Zebra' }, { id: 'b', nome: 'Álvaro' }, { id: 'c', nome: 'Bento' })
    renderAt('/perfis')
    const nomes = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(nomes).toEqual(['Álvaro', 'Bento', 'Zebra'])
  })

  it('exclui somente após confirmação; Cancelar e Esc mantêm o perfil', async () => {
    semear({ id: 'a', nome: 'Alfa' }, { id: 'b', nome: 'Beta' })
    renderAt('/perfis')

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Alfa' }))
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Excluir o perfil Alfa?')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(salvos()).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Alfa' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(salvos()).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Alfa' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }))
    expect(screen.getByRole('status')).toHaveTextContent('Perfil excluído.')
    expect(screen.queryByRole('heading', { name: 'Alfa' })).toBeNull()
    expect(salvos().map((p) => p.id)).toEqual(['b'])
  })

  it('mostra a logo do perfil no cartão', () => {
    semear({ id: 'a', nome: 'Alfa', escola: 'Escola Alfa', logo: LOGO })
    renderAt('/perfis')
    expect(screen.getByRole('img', { name: 'Logo da escola' })).toHaveAttribute('src', LOGO)
  })
})

describe('Formulário de perfil', () => {
  it('sem nome e escola, mostra mensagens em pt-BR, marca os campos e não grava nada', async () => {
    renderAt('/perfis/novo')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    const nome = screen.getByLabelText(/Nome do perfil/)
    const escola = screen.getByLabelText(/Nome da escola/)
    expect(screen.getByText('Informe o nome do perfil.')).toBeInTheDocument()
    expect(screen.getByText('Informe o nome da escola.')).toBeInTheDocument()
    expect(nome).toHaveAttribute('aria-invalid', 'true')
    expect(escola).toHaveAttribute('aria-invalid', 'true')
    expect(nome).toHaveAccessibleDescription(/Informe o nome do perfil/)
    expect(nome).toHaveFocus()
    expect(localStorage.getItem('provario:profiles')).toBeNull()

    await userEvent.type(nome, 'Manhã')
    expect(screen.queryByText('Informe o nome do perfil.')).toBeNull()
    expect(screen.getByText('Informe o nome da escola.')).toBeInTheDocument()
  })

  it('só espaços em nome e escola também é recusado', async () => {
    renderAt('/perfis/novo')
    await preencher('   ', '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
    expect(screen.getByText('Informe o nome do perfil.')).toBeInTheDocument()
    expect(salvos()).toHaveLength(0)
  })

  it('perfil novo começa com o ano atual e a professora do perfil editado mais recentemente', () => {
    semear(
      { id: 'a', nome: 'Alfa', professora: 'Ana', atualizadoEm: '2026-02-01T00:00:00.000Z' },
      { id: 'b', nome: 'Beta', professora: 'Beatriz', atualizadoEm: '2026-05-01T00:00:00.000Z' },
    )
    renderAt('/perfis/novo')
    expect(screen.getByLabelText('Professora')).toHaveValue('Beatriz')
    expect(screen.getByLabelText('Ano letivo')).toHaveValue(String(new Date().getFullYear()))
  })

  it('grava os seis campos aparando espaços', async () => {
    renderAt('/perfis/novo')
    await preencher('  Manhã  ', '  Escola Alfa  ')
    await userEvent.type(screen.getByLabelText(/Secretaria/), ' Secretaria de Educação ')
    await userEvent.type(screen.getByLabelText('Professora'), ' Maria ')
    await userEvent.clear(screen.getByLabelText('Ano letivo'))
    await userEvent.type(screen.getByLabelText('Ano letivo'), '2027')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    expect(salvos()).toHaveLength(1)
    expect(salvos()[0]).toMatchObject({
      nome: 'Manhã',
      escola: 'Escola Alfa',
      secretaria: 'Secretaria de Educação',
      professora: 'Maria',
      anoLetivo: '2027',
      logo: '',
    })
    expect(salvos()[0].id).toBeTruthy()
  })

  it('a pré-visualização acompanha o que é digitado', async () => {
    renderAt('/perfis/novo')
    const previa = screen.getByRole('region', { name: 'Pré-visualização' })
    await userEvent.type(screen.getByLabelText(/Nome da escola/), 'Escola Zeta')
    await userEvent.type(screen.getByLabelText(/Secretaria/), 'Rede Municipal')
    expect(within(previa).getByText('Escola Zeta')).toBeInTheDocument()
    expect(within(previa).getByText('Rede Municipal')).toBeInTheDocument()
  })

  it('escolher a logo mostra a miniatura na pré-visualização; Remover logo limpa', async () => {
    vi.mocked(processLogo).mockResolvedValue(LOGO)
    renderAt('/perfis/novo')
    const previa = screen.getByRole('region', { name: 'Pré-visualização' })
    expect(within(previa).queryByRole('img')).toBeNull()

    const arquivo = new File(['x'], 'logo.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Escolher logo'), arquivo)
    expect(processLogo).toHaveBeenCalledWith(arquivo)
    expect(await within(previa).findByRole('img', { name: 'Logo da escola' })).toHaveAttribute('src', LOGO)

    await preencher('Manhã', 'Escola Alfa')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
    expect(salvos()[0].logo).toBe(LOGO)

    await userEvent.click(screen.getByRole('link', { name: 'Editar Manhã' }))
    expect(screen.getByLabelText('Trocar logo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remover logo' }))
    expect(within(screen.getByRole('region', { name: 'Pré-visualização' })).queryByRole('img')).toBeNull()
    expect(screen.getByLabelText('Escolher logo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))
    expect(salvos()[0].logo).toBe('')
  })

  it('logo inválida mostra o erro em role=alert e não mexe no perfil', async () => {
    vi.mocked(processLogo).mockRejectedValue(new LogoError('Formato não suportado. Use PNG, JPG ou WebP.'))
    renderAt('/perfis/novo')
    await userEvent.upload(screen.getByLabelText('Escolher logo'), new File(['x'], 'a.png', { type: 'image/png' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Formato não suportado. Use PNG, JPG ou WebP.')
    expect(within(screen.getByRole('region', { name: 'Pré-visualização' })).queryByRole('img')).toBeNull()
  })

  it('editar um perfil altera só ele, sem duplicar', async () => {
    semear(
      { id: 'a', nome: 'Alfa', escola: 'Escola Alfa', criadoEm: '2026-01-01T10:00:00.000Z' },
      { id: 'b', nome: 'Beta', escola: 'Escola Beta' },
    )
    renderAt('/perfis')
    await userEvent.click(screen.getByRole('link', { name: 'Editar Alfa' }))
    expect(screen.getByLabelText(/Nome da escola/)).toHaveValue('Escola Alfa')
    await userEvent.clear(screen.getByLabelText(/Nome da escola/))
    await userEvent.type(screen.getByLabelText(/Nome da escola/), 'Escola Alfa Nova')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    expect(screen.getByRole('status')).toHaveTextContent('Perfil salvo.')
    const [a, b] = salvos()
    expect(salvos()).toHaveLength(2)
    expect(a).toMatchObject({ id: 'a', escola: 'Escola Alfa Nova', criadoEm: '2026-01-01T10:00:00.000Z' })
    expect(a.atualizadoEm).not.toBe('2026-01-01T10:00:00.000Z')
    expect(b).toMatchObject({ id: 'b', escola: 'Escola Beta' })
  })

  it('recarregar em /perfis/:id abre o formulário preenchido', () => {
    semear({ id: 'a', nome: 'Alfa', escola: 'Escola Alfa', secretaria: 'Rede X', professora: 'Ana', anoLetivo: '2025' })
    renderAt('/perfis/a')
    expect(screen.getByLabelText(/Nome do perfil/)).toHaveValue('Alfa')
    expect(screen.getByLabelText(/Nome da escola/)).toHaveValue('Escola Alfa')
    expect(screen.getByLabelText(/Secretaria/)).toHaveValue('Rede X')
    expect(screen.getByLabelText('Professora')).toHaveValue('Ana')
    expect(screen.getByLabelText('Ano letivo')).toHaveValue('2025')
  })

  it('erro de cota ao salvar mostra mensagem clara e mantém o que foi digitado', async () => {
    renderAt('/perfis/novo')
    await preencher('Manhã', 'Escola Alfa')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError')
    })
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    expect(screen.getByRole('alert')).toHaveTextContent('armazenamento do navegador')
    expect(screen.getByLabelText(/Nome do perfil/)).toHaveValue('Manhã')
    expect(screen.getByLabelText(/Nome da escola/)).toHaveValue('Escola Alfa')
    expect(screen.getByRole('button', { name: 'Salvar perfil' })).toBeInTheDocument()
  })

  it('Cancelar volta para a lista sem gravar', async () => {
    renderAt('/perfis/novo')
    await userEvent.type(screen.getByLabelText(/Nome do perfil/), 'Rascunho')
    await userEvent.click(screen.getByRole('link', { name: 'Cancelar' }))
    expect(screen.getByRole('heading', { name: 'Perfis' })).toBeInTheDocument()
    expect(localStorage.getItem('provario:profiles')).toBeNull()
  })

  it('id inexistente mostra aviso com link para a lista', async () => {
    renderAt('/perfis/nao-existe')
    expect(screen.getByRole('alert')).toHaveTextContent('Perfil não encontrado')
    await userEvent.click(screen.getByRole('link', { name: 'Voltar para a lista de perfis' }))
    expect(screen.getByRole('heading', { name: 'Perfis' })).toBeInTheDocument()
  })
})

describe('Navegação', () => {
  it('a aba "Perfis" fica ativa na lista e no formulário, e "Início" não', () => {
    renderAt('/perfis/novo')
    expect(screen.getByRole('link', { name: 'Perfis' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })

  it('a aba "Perfis" fica entre Início e Configurações', () => {
    renderAt('/')
    const abas = within(screen.getByRole('navigation', { name: 'Principal' })).getAllByRole('link')
    expect(abas.map((a) => a.textContent)).toEqual(['Início', 'Perfis', 'Configurações'])
  })
})
