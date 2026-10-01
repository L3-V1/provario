import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Exam, ExamsData } from '../lib/exams'
import { routes } from '../router'

function prova(over: Partial<Exam> = {}): Exam {
  return {
    id: 'e1',
    titulo: 'Avaliação de Ciências — 7º ano',
    params: {
      perfilId: 'p1',
      disciplina: 'Ciências',
      serie: '7º ano',
      turmas: '7º A, 7º B',
      conteudo: 'Células e tecidos',
      quantidade: 2,
      alternativas: 4,
      dificuldade: 'media',
      titulo: '',
      observacoes: '',
    },
    perfil: { id: 'p1', nome: 'Manhã', escola: 'Escola Alfa', secretaria: '', logo: '', professora: 'Ana', anoLetivo: '2026' },
    questoes: [
      { enunciado: 'Pergunta 1?', alternativas: ['a', 'b', 'c', 'd'], correta: 0 },
      { enunciado: 'Pergunta 2?', alternativas: ['e', 'f', 'g', 'h'], correta: 1 },
    ],
    modelo: 'gemini',
    criadoEm: '2026-03-10T10:00:00.000Z',
    atualizadoEm: '2026-03-10T10:00:00.000Z',
    ...over,
  }
}

function semear(...provas: Exam[]) {
  const data: ExamsData = { version: 1, provas }
  localStorage.setItem('provario:exams', JSON.stringify(data))
}

const lerProvas = (): Exam[] => JSON.parse(localStorage.getItem('provario:exams') ?? '{"provas":[]}').provas

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Provas — estado vazio', () => {
  it('Dado que não há provas, mostra mensagem amigável com link para gerar a primeira', () => {
    renderAt('/provas')
    expect(screen.getByRole('heading', { level: 1, name: 'Provas' })).toBeInTheDocument()
    expect(screen.getByText('Nenhuma prova salva ainda.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gerar primeira prova' })).toHaveAttribute('href', '/provas/nova')
  })

  it('tolera dado corrompido no armazenamento', () => {
    localStorage.setItem('provario:exams', '{lixo')
    renderAt('/provas')
    expect(screen.getByText('Nenhuma prova salva ainda.')).toBeInTheDocument()
  })
})

describe('Provas — lista', () => {
  it('tem o botão "Nova prova" no topo, que leva ao formulário', async () => {
    semear(prova())
    const router = renderAt('/provas')
    await userEvent.click(screen.getByRole('link', { name: 'Nova prova' }))
    expect(router.state.location.pathname).toBe('/provas/nova')
  })

  it('Dado várias provas, lista da mais recente para a mais antiga', () => {
    semear(
      prova({ id: 'a', titulo: 'Antiga', criadoEm: '2026-01-01T10:00:00.000Z' }),
      prova({ id: 'b', titulo: 'Recente', criadoEm: '2026-05-01T10:00:00.000Z' }),
      prova({ id: 'c', titulo: 'Intermediária', criadoEm: '2026-03-01T10:00:00.000Z' }),
    )
    renderAt('/provas')
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titulos).toEqual(['Recente', 'Intermediária', 'Antiga'])
  })

  it('cada ficha mostra conteúdo, série, turmas, escola, perfil e data de geração', () => {
    semear(prova())
    renderAt('/provas')
    const ficha = screen.getByRole('listitem')
    expect(within(ficha).getByRole('heading', { level: 2, name: 'Avaliação de Ciências — 7º ano' })).toBeInTheDocument()
    expect(within(ficha).getByText('Células e tecidos')).toBeInTheDocument()
    expect(within(ficha).getByText(/7º ano/, { selector: 'dd' })).toBeInTheDocument()
    expect(within(ficha).getByText('7º A, 7º B')).toBeInTheDocument()
    expect(within(ficha).getByText('Escola Alfa')).toBeInTheDocument()
    expect(within(ficha).getByText('Manhã')).toBeInTheDocument()
    expect(within(ficha).getByText(new Date('2026-03-10T10:00:00.000Z').toLocaleDateString('pt-BR'))).toBeInTheDocument()
    expect(within(ficha).queryByText(/Editada em/)).toBeNull()
  })

  it('mostra "Editada em" só quando atualizadoEm é de outro dia', () => {
    semear(prova({ atualizadoEm: '2026-04-20T10:00:00.000Z' }))
    renderAt('/provas')
    expect(screen.getByText(new Date('2026-04-20T10:00:00.000Z').toLocaleDateString('pt-BR'))).toBeInTheDocument()
    expect(screen.getByText(/Editada em/)).toBeInTheDocument()
  })

  it('os botões têm aria-label com o título da prova', () => {
    semear(prova({ titulo: 'Bimestral' }))
    renderAt('/provas')
    expect(screen.getByRole('link', { name: 'Abrir Bimestral' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Duplicar Bimestral' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Excluir Bimestral' })).toBeInTheDocument()
  })
})

describe('Provas — abrir', () => {
  it('Quando clica em Abrir, vai para a prova, onde pode editar e reimprimir', async () => {
    semear(prova({ id: 'x1', titulo: 'Bimestral' }))
    const router = renderAt('/provas')
    await userEvent.click(screen.getByRole('link', { name: 'Abrir Bimestral' }))
    expect(router.state.location.pathname).toBe('/provas/x1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Bimestral' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Editar prova/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Imprimir/ })).toBeEnabled()
  })
})

describe('Provas — duplicar', () => {
  it('Quando duplica, grava a cópia com id novo e título "(cópia)" e abre a cópia com aviso', async () => {
    semear(prova({ id: 'orig', titulo: 'Bimestral' }))
    const router = renderAt('/provas')
    await userEvent.click(screen.getByRole('button', { name: 'Duplicar Bimestral' }))

    const salvas = lerProvas()
    expect(salvas).toHaveLength(2)
    const copia = salvas.find((p) => p.id !== 'orig')!
    expect(copia.titulo).toBe('Bimestral (cópia)')
    expect(router.state.location.pathname).toBe(`/provas/${copia.id}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Bimestral (cópia)' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cópia criada. Edite o título e as questões se quiser.')
  })

  it('editar e salvar a cópia mantém a original intacta', async () => {
    semear(prova({ id: 'orig', titulo: 'Bimestral' }))
    renderAt('/provas')
    await userEvent.click(screen.getByRole('button', { name: 'Duplicar Bimestral' }))
    await screen.findByRole('heading', { level: 1, name: 'Bimestral (cópia)' })

    await userEvent.click(screen.getByRole('button', { name: /Editar prova/ }))
    const campo = screen.getByLabelText('Enunciado da questão 1')
    await userEvent.clear(campo)
    await userEvent.type(campo, 'Texto alterado na cópia')
    await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }))

    const salvas = lerProvas()
    const original = salvas.find((p) => p.id === 'orig')!
    const copia = salvas.find((p) => p.id !== 'orig')!
    expect(original.questoes[0].enunciado).toBe('Pergunta 1?')
    expect(original.titulo).toBe('Bimestral')
    expect(copia.questoes[0].enunciado).toBe('Texto alterado na cópia')
  })

  it('a cópia aparece no topo da lista', async () => {
    semear(prova({ id: 'orig', titulo: 'Bimestral' }))
    renderAt('/provas')
    await userEvent.click(screen.getByRole('button', { name: 'Duplicar Bimestral' }))
    await userEvent.click(await screen.findByRole('link', { name: 'Provas' }))
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titulos).toEqual(['Bimestral (cópia)', 'Bimestral'])
  })

  it('se faltar espaço no navegador, mostra erro e não navega', async () => {
    semear(prova({ id: 'orig', titulo: 'Bimestral' }))
    const router = renderAt('/provas')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError')
    })
    await userEvent.click(screen.getByRole('button', { name: 'Duplicar Bimestral' }))
    expect(screen.getByRole('alert')).toHaveTextContent('armazenamento do navegador está cheio')
    expect(router.state.location.pathname).toBe('/provas')
    expect(lerProvas()).toHaveLength(1)
  })
})

describe('Provas — excluir', () => {
  it('Cancelar na confirmação mantém a prova', async () => {
    semear(prova({ titulo: 'Bimestral' }))
    renderAt('/provas')
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Bimestral' }))
    const dialogo = screen.getByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Bimestral')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(lerProvas()).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 2, name: 'Bimestral' })).toBeInTheDocument()
  })

  it('Confirmar remove só aquela prova e avisa', async () => {
    semear(prova({ id: 'a', titulo: 'Bimestral' }), prova({ id: 'b', titulo: 'Outra', criadoEm: '2026-04-01T10:00:00.000Z' }))
    renderAt('/provas')
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Bimestral' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }))
    expect(lerProvas().map((p) => p.id)).toEqual(['b'])
    expect(screen.queryByRole('heading', { level: 2, name: 'Bimestral' })).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Prova excluída.')
  })

  it('excluir a última prova leva ao estado vazio', async () => {
    semear(prova({ titulo: 'Bimestral' }))
    renderAt('/provas')
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Bimestral' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }))
    expect(screen.getByText('Nenhuma prova salva ainda.')).toBeInTheDocument()
  })
})

describe('Provas — aba de navegação', () => {
  it.each(['/provas', '/provas/nova', '/provas/inexistente'])('a aba "Provas" fica ativa em %s', async (caminho) => {
    renderAt(caminho)
    await waitFor(() => expect(screen.getByRole('link', { name: 'Provas' })).toHaveAttribute('aria-current', 'page'))
    expect(screen.getByRole('link', { name: 'Perfis' })).not.toHaveAttribute('aria-current')
  })
})
