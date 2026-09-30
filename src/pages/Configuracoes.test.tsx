import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../router'

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Início e navegação', () => {
  it('sem chave, Início avisa e leva às Configurações', async () => {
    renderAt('/')
    expect(screen.getByRole('alert')).toHaveTextContent('não configurou a chave')
    await userEvent.click(screen.getByRole('link', { name: 'Ir para Configurações' }))
    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
  })

  it('com chave salva, o aviso não aparece', () => {
    localStorage.setItem('provario:settings', '{"version":1,"geminiApiKey":"abc"}')
    renderAt('/')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('Configurações', () => {
  it('salva a chave aparando espaços e mostra feedback', async () => {
    renderAt('/configuracoes')
    await userEvent.type(screen.getByLabelText('Chave do Gemini'), '  abc123  ')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar chave' }))
    expect(screen.getByRole('status')).toHaveTextContent('Chave salva')
    expect(JSON.parse(localStorage.getItem('provario:settings')!).geminiApiKey).toBe('abc123')
  })

  it('a chave salva continua lá depois de remontar a tela (recarregar)', () => {
    localStorage.setItem('provario:settings', '{"version":1,"geminiApiKey":"persistida"}')
    renderAt('/configuracoes')
    expect(screen.getByLabelText('Chave do Gemini')).toHaveValue('persistida')
  })

  it('mostrar/ocultar alterna o tipo do campo', async () => {
    renderAt('/configuracoes')
    const input = screen.getByLabelText('Chave do Gemini')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar' }))
    expect(input).toHaveAttribute('type', 'text')
  })

  it('Testar conexão e Remover ficam desabilitados sem chave', () => {
    renderAt('/configuracoes')
    expect(screen.getByRole('button', { name: 'Testar conexão' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remover chave' })).toBeDisabled()
  })

  it('remove a chave somente após confirmação', async () => {
    localStorage.setItem('provario:settings', '{"version":1,"geminiApiKey":"abc"}')
    renderAt('/configuracoes')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    await userEvent.click(screen.getByRole('button', { name: 'Remover chave' }))
    expect(screen.getByLabelText('Chave do Gemini')).toHaveValue('abc')
    confirm.mockReturnValueOnce(true)
    await userEvent.click(screen.getByRole('button', { name: 'Remover chave' }))
    expect(screen.getByLabelText('Chave do Gemini')).toHaveValue('')
    expect(JSON.parse(localStorage.getItem('provario:settings')!).geminiApiKey).toBe('')
  })

  it('Testar conexão mostra "Testando…" e depois sucesso em role=status', async () => {
    localStorage.setItem('provario:settings', '{"version":1,"geminiApiKey":"abc"}')
    let resolve!: (r: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => (resolve = r))))
    renderAt('/configuracoes')
    await userEvent.click(screen.getByRole('button', { name: 'Testar conexão' }))
    expect(screen.getByRole('button', { name: 'Testando…' })).toBeDisabled()
    resolve(new Response('{}', { status: 200 }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('funcionando'))
  })

  it('chave inválida mostra mensagem clara em role=alert', async () => {
    localStorage.setItem('provario:settings', '{"version":1,"geminiApiKey":"falsa"}')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":{"message":"API key not valid. Please pass a valid API key."}}', { status: 400 })))
    renderAt('/configuracoes')
    await userEvent.click(screen.getByRole('button', { name: 'Testar conexão' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Chave inválida')
  })

  it('traz o passo a passo com link para o Google AI Studio e o aviso de privacidade', () => {
    renderAt('/configuracoes')
    expect(screen.getByRole('link', { name: /aistudio.google.com\/apikey/ })).toHaveAttribute(
      'href',
      'https://aistudio.google.com/apikey',
    )
    expect(screen.getByText(/somente neste navegador/)).toBeInTheDocument()
  })
})
