import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Backup } from '../lib/backup'
import type { Exam } from '../lib/exams'
import type { Profile } from '../lib/profiles'
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
    await userEvent.click(screen.getByRole('button', { name: 'Remover chave' }))
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Remover a chave do Gemini?')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByLabelText('Chave do Gemini')).toHaveValue('abc')

    await userEvent.click(screen.getByRole('button', { name: 'Remover chave' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Remover chave' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }))
    expect(screen.getByLabelText('Chave do Gemini')).toHaveValue('')
    expect(screen.getByRole('status')).toHaveTextContent('Chave removida')
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

// ---------- Backup dos dados ----------

function perfil(over: Partial<Profile> = {}): Profile {
  return {
    id: 'p1',
    nome: 'Manhã',
    escola: 'Escola Alfa',
    secretaria: '',
    logo: 'data:image/png;base64,iVBORw0KGgo=',
    professora: 'Ana',
    anoLetivo: '2026',
    criadoEm: '2026-01-01T10:00:00.000Z',
    atualizadoEm: '2026-01-01T10:00:00.000Z',
    ...over,
  }
}

function prova(over: Partial<Exam> = {}): Exam {
  return {
    id: 'e1',
    titulo: 'Avaliação',
    params: {
      perfilId: 'p1',
      disciplina: 'Ciências',
      serie: '7º ano',
      turmas: '7º A',
      conteudo: 'Células',
      quantidade: 1,
      alternativas: 4,
      dificuldade: 'media',
      titulo: '',
      observacoes: '',
    },
    perfil: { id: 'p1', nome: 'Manhã', escola: 'Escola Alfa', secretaria: '', logo: '', professora: 'Ana', anoLetivo: '2026' },
    questoes: [{ enunciado: 'Q?', alternativas: ['a', 'b', 'c', 'd'], correta: 1 }],
    modelo: 'gemini',
    criadoEm: '2026-03-10T10:00:00.000Z',
    atualizadoEm: '2026-03-10T10:00:00.000Z',
    ...over,
  }
}

function semear(perfis: Profile[], provas: Exam[]) {
  localStorage.setItem('provario:profiles', JSON.stringify({ version: 1, perfis }))
  localStorage.setItem('provario:exams', JSON.stringify({ version: 1, provas }))
}

const lerPerfis = () => JSON.parse(localStorage.getItem('provario:profiles') ?? '{"perfis":[]}').perfis as Profile[]
const lerProvas = () => JSON.parse(localStorage.getItem('provario:exams') ?? '{"provas":[]}').provas as Exam[]

function arquivoBackup(perfis: Profile[], provas: Exam[], exportadoEm = '2026-10-01T15:00:00.000Z'): File {
  const b: Backup = { app: 'provario', version: 1, exportadoEm, perfis, provas }
  return new File([JSON.stringify(b)], 'backup.json', { type: 'application/json' })
}

const entradaArquivo = () => screen.getByLabelText('Arquivo de backup', { selector: 'input' }) as HTMLInputElement

async function importar(arquivo: File) {
  await userEvent.upload(entradaArquivo(), arquivo)
}

/** jsdom não tem URL.createObjectURL; captura o Blob exportado e o nome do arquivo. */
function capturarDownload() {
  const blobs: Blob[] = []
  const nomes: string[] = []
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn((b: Blob) => (blobs.push(b), 'blob:fake')),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    nomes.push(this.download)
  })
  return { blobs, nomes }
}

describe('Configurações — exportar backup', () => {
  it('Quando exporta, baixa provario-backup-AAAA-MM-DD.json com perfis e provas, sem a chave', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 1, 12, 0) })
    try {
      localStorage.setItem('provario:settings', '{"version":1,"geminiApiKey":"segredo"}')
      semear([perfil()], [prova(), prova({ id: 'e2' })])
      const { blobs, nomes } = capturarDownload()
      renderAt('/configuracoes')

      await userEvent.click(screen.getByRole('button', { name: 'Exportar backup' }))

      expect(nomes).toEqual(['provario-backup-2026-10-01.json'])
      const texto = await blobs[0].text()
      const b = JSON.parse(texto) as Backup
      expect(b.app).toBe('provario')
      expect(b.perfis).toEqual([perfil()])
      expect(b.provas.map((p) => p.id)).toEqual(['e1', 'e2'])
      expect(texto).not.toContain('segredo')
      expect(screen.getByRole('status')).toHaveTextContent('Backup exportado: 1 perfil e 2 provas')
    } finally {
      vi.useRealTimers()
    }
  })

  it('sem dados, exporta um backup vazio e avisa "0 perfis e 0 provas"', async () => {
    capturarDownload()
    renderAt('/configuracoes')
    await userEvent.click(screen.getByRole('button', { name: 'Exportar backup' }))
    expect(screen.getByRole('status')).toHaveTextContent('Backup exportado: 0 perfis e 0 provas')
  })

  it('explica o que entra no arquivo e que a chave não entra', () => {
    renderAt('/configuracoes')
    const secao = screen.getByRole('heading', { name: 'Backup dos dados' }).closest('section')!
    expect(secao).toHaveTextContent(/perfis e as provas/)
    expect(secao).toHaveTextContent(/chave do Gemini não entra/)
  })
})

describe('Configurações — importar backup: validação', () => {
  it('arquivo inválido mostra o erro e não altera os dados', async () => {
    semear([perfil()], [prova()])
    renderAt('/configuracoes')
    await importar(new File(['isto não é json'], 'x.json', { type: 'application/json' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('O arquivo não é um JSON válido.')
    expect(screen.queryByRole('button', { name: 'Mesclar com os dados atuais' })).toBeNull()
    expect(lerPerfis()).toEqual([perfil()])
    expect(lerProvas()).toEqual([prova()])
  })

  it('backup com um item inválido é recusado por inteiro, dizendo qual', async () => {
    renderAt('/configuracoes')
    await importar(arquivoBackup([perfil()], [prova(), prova({ id: 'e2', questoes: [] })]))
    expect(await screen.findByRole('alert')).toHaveTextContent('prova 2')
    expect(lerProvas()).toEqual([])
  })

  it('arquivo válido abre o resumo com data, perfis e provas e três opções', async () => {
    renderAt('/configuracoes')
    await importar(arquivoBackup([perfil(), perfil({ id: 'p2' })], [prova()], new Date(2026, 9, 1, 12).toISOString()))

    expect(await screen.findByText('Backup de 01/10/2026 com 2 perfis e 1 prova')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mesclar com os dados atuais' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Substituir tudo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(lerPerfis()).toEqual([])
  })

  it('Cancelar fecha o painel sem gravar nada', async () => {
    renderAt('/configuracoes')
    await importar(arquivoBackup([perfil()], [prova()]))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('button', { name: 'Substituir tudo' })).toBeNull()
    expect(lerPerfis()).toEqual([])
    expect(lerProvas()).toEqual([])
  })

  it('permite escolher o mesmo arquivo de novo depois de cancelar', async () => {
    renderAt('/configuracoes')
    const arq = arquivoBackup([perfil()], [prova()])
    await importar(arq)
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await importar(arq)
    expect(await screen.findByRole('button', { name: 'Substituir tudo' })).toBeInTheDocument()
  })
})

describe('Configurações — importar backup: mesclar e substituir', () => {
  it('Mesclar junta com os dados atuais e avisa as contagens', async () => {
    semear([perfil({ id: 'x', nome: 'Atual' })], [prova({ id: 'ex' }), prova({ id: 'e1', titulo: 'Velha' })])
    renderAt('/configuracoes')
    await importar(
      arquivoBackup(
        [perfil({ id: 'p1' })],
        [prova({ id: 'e1', titulo: 'Nova', atualizadoEm: '2026-09-01T00:00:00.000Z' }), prova({ id: 'e3' })],
      ),
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Mesclar com os dados atuais' }))

    expect(lerPerfis().map((p) => p.id)).toEqual(['x', 'p1'])
    expect(lerProvas().map((p) => [p.id, p.titulo])).toEqual([
      ['ex', 'Avaliação'],
      ['e1', 'Nova'],
      ['e3', 'Avaliação'],
    ])
    expect(screen.getByRole('status')).toHaveTextContent('Backup importado. Perfis: 1 novo, 0 atualizados. Provas: 1 nova, 1 atualizada.')
    expect(screen.queryByRole('button', { name: 'Substituir tudo' })).toBeNull()
  })

  it('Substituir pede confirmação dizendo quantos perfis e provas atuais serão apagados', async () => {
    semear([perfil({ id: 'x' }), perfil({ id: 'y' })], [prova({ id: 'ex' })])
    renderAt('/configuracoes')
    await importar(arquivoBackup([perfil({ id: 'p1' })], [prova({ id: 'e1' })]))
    await userEvent.click(await screen.findByRole('button', { name: 'Substituir tudo' }))

    const dialogo = screen.getByRole('alertdialog')
    expect(dialogo).toHaveTextContent('2 perfis e 1 prova')
    // nada mudou ainda
    expect(lerPerfis().map((p) => p.id)).toEqual(['x', 'y'])

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(lerPerfis().map((p) => p.id)).toEqual(['x', 'y'])
    expect(screen.getByRole('button', { name: 'Substituir tudo' })).toBeInTheDocument()
  })

  it('Confirmar a substituição deixa só o conteúdo do backup', async () => {
    semear([perfil({ id: 'x' })], [prova({ id: 'ex' })])
    renderAt('/configuracoes')
    await importar(arquivoBackup([perfil({ id: 'p1' })], [prova({ id: 'e1' }), prova({ id: 'e2' })]))
    await userEvent.click(await screen.findByRole('button', { name: 'Substituir tudo' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Substituir' }))

    expect(lerPerfis().map((p) => p.id)).toEqual(['p1'])
    expect(lerProvas().map((p) => p.id)).toEqual(['e1', 'e2'])
    expect(screen.getByRole('status')).toHaveTextContent('Backup importado: 1 perfil e 2 provas.')
  })

  it('se faltar espaço no navegador, mostra o erro e a importação é revertida', async () => {
    semear([perfil({ id: 'antigo' })], [prova({ id: 'ex' })])
    renderAt('/configuracoes')
    await importar(arquivoBackup([perfil({ id: 'p1' })], [prova({ id: 'e1' })]))
    const botao = await screen.findByRole('button', { name: 'Mesclar com os dados atuais' })

    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === 'provario:exams') throw new DOMException('cheio', 'QuotaExceededError')
      return original.call(this, k, v)
    })
    await userEvent.click(botao)

    expect(await screen.findByRole('alert')).toHaveTextContent('armazenamento do navegador está cheio')
    expect(lerPerfis().map((p) => p.id)).toEqual(['antigo'])
    expect(lerProvas().map((p) => p.id)).toEqual(['ex'])
  })
})

describe('Configurações — critério da fase: exportar, limpar e importar', () => {
  it('exportar → localStorage.clear() → importar com "Substituir" restaura perfis e provas idênticos', async () => {
    const perfis = [perfil(), perfil({ id: 'p2', nome: 'Tarde', logo: '' })]
    const provas = [prova(), prova({ id: 'e2', titulo: 'Outra', criadoEm: '2026-04-01T10:00:00.000Z' })]
    semear(perfis, provas)
    const { blobs } = capturarDownload()
    renderAt('/configuracoes')
    await userEvent.click(screen.getByRole('button', { name: 'Exportar backup' }))
    const conteudo = await blobs[0].text()

    localStorage.clear()
    expect(lerPerfis()).toEqual([])

    await importar(new File([conteudo], 'provario-backup.json', { type: 'application/json' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Substituir tudo' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Substituir' }))

    expect(lerPerfis()).toEqual(perfis)
    expect(lerProvas()).toEqual(provas)
  })
})
