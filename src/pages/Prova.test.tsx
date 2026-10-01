import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Exam, ExamsData } from '../lib/exams'
import { routes } from '../router'

const LOGO = 'data:image/png;base64,iVBORw0KGgo='

function prova(over: Partial<Exam> = {}, perfil: Partial<Exam['perfil']> = {}): Exam {
  return {
    id: 'e1',
    titulo: 'Avaliação de Ciências — 7º ano',
    params: {
      perfilId: 'p1',
      disciplina: 'Ciências',
      serie: '7º ano',
      turmas: '7º A, 7º B',
      conteudo: 'Células',
      quantidade: 5,
      alternativas: 5,
      dificuldade: 'media',
      titulo: '',
      observacoes: '',
    },
    perfil: {
      id: 'p1',
      nome: 'Manhã',
      escola: 'Escola Alfa',
      secretaria: 'Secretaria de Educação',
      logo: LOGO,
      professora: 'Ana',
      anoLetivo: '2026',
      ...perfil,
    },
    questoes: Array.from({ length: 5 }, (_, i) => ({
      enunciado: `Pergunta ${i + 1} sobre células?`,
      alternativas: Array.from({ length: 5 }, (_, j) => `Opção ${i + 1}.${j + 1}`),
      correta: i,
    })),
    modelo: 'gemini',
    criadoEm: '2026-03-10T10:00:00.000Z',
    atualizadoEm: '2026-03-10T10:00:00.000Z',
    ...over,
  }
}

function semear(p: Exam = prova()) {
  const data: ExamsData = { version: 1, provas: [p] }
  localStorage.setItem('provario:exams', JSON.stringify(data))
}

function renderProva(id = 'e1', state?: unknown) {
  const router = createMemoryRouter(routes, { initialEntries: [{ pathname: `/provas/${id}`, state }] })
  render(<RouterProvider router={router} />)
  return router
}

const escondidoNaImpressao = (el: HTMLElement) => el.closest('.print\\:hidden') !== null

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Prova — cabeçalho institucional', () => {
  it('Dado um perfil completo, então mostra logo, secretaria, escola, identificação e campos a preencher', () => {
    semear()
    renderProva()
    const folha = screen.getByRole('article', { name: 'Prova' })
    const cab = within(folha).getByRole('banner')

    expect(within(cab).getByRole('img', { name: 'Logo da escola' })).toHaveAttribute('src', LOGO)
    expect(within(cab).getByText('Secretaria de Educação')).toBeInTheDocument()
    expect(within(cab).getByText('Escola Alfa')).toBeInTheDocument()
    expect(within(cab).getByText('Professora: Ana')).toBeInTheDocument()
    expect(within(cab).getByText(/Ciências/)).toBeInTheDocument()
    expect(within(cab).getByText(/7º ano/)).toBeInTheDocument()
    expect(within(cab).getByText(/2026/)).toBeInTheDocument()
    for (const rotulo of ['Aluno(a)', 'Nº', 'Turma', 'Data', 'Nota']) {
      expect(within(cab).getByText(rotulo)).toBeInTheDocument()
    }
  })

  it('Dado um perfil sem logo, então não renderiza imagem nem placeholder', () => {
    semear(prova({}, { logo: '', secretaria: '' }))
    renderProva()
    const cab = within(screen.getByRole('article', { name: 'Prova' })).getByRole('banner')
    expect(within(cab).queryByRole('img')).not.toBeInTheDocument()
    expect(within(cab).queryByText('Secretaria de Educação')).not.toBeInTheDocument()
    expect(within(cab).getByText('Escola Alfa')).toBeInTheDocument()
  })
})

describe('Prova — questões', () => {
  it('Então numera as questões, mostra a)–e) e impede quebra de página dentro de cada uma', () => {
    semear()
    renderProva()
    const folha = screen.getByRole('article', { name: 'Prova' })
    const lista = within(folha).getByRole('list', { name: 'Questões' })
    const itens = within(lista).getAllByRole('listitem', { hidden: false }).filter((li) => li.parentElement === lista)

    expect(itens).toHaveLength(5)
    itens.forEach((li) => expect(li).toHaveClass('break-inside-avoid'))
    expect(within(itens[0]).getByText('1. Pergunta 1 sobre células?')).toBeInTheDocument()
    expect(within(itens[4]).getByText('5. Pergunta 5 sobre células?')).toBeInTheDocument()
    const alternativas = within(itens[2]).getAllByRole('listitem').map((li) => li.textContent)
    expect(alternativas).toEqual(['a) Opção 3.1', 'b) Opção 3.2', 'c) Opção 3.3', 'd) Opção 3.4', 'e) Opção 3.5'])
  })

  it('Então o título da prova fica na folha, sem quebra de página logo depois', () => {
    semear()
    renderProva()
    const folha = screen.getByRole('article', { name: 'Prova' })
    const titulo = within(folha).getByRole('heading', { level: 2, name: 'Avaliação de Ciências — 7º ano' })
    expect(titulo).toHaveClass('break-after-avoid')
  })
})

describe('Prova — gabarito', () => {
  it('Então é uma região em página nova, com escola, série, turmas e células na ordem', () => {
    semear()
    renderProva()
    const gab = screen.getByRole('region', { name: /Gabarito/ })
    expect(gab).toHaveClass('print:break-before-page')
    expect(within(gab).getByText('Escola Alfa · 7º ano · 7º A, 7º B')).toBeInTheDocument()
    expect(within(gab).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1 – a',
      '2 – b',
      '3 – c',
      '4 – d',
      '5 – e',
    ])
    expect(within(gab).getByRole('list')).toHaveClass('grid-cols-5')
  })

  it('Dado que não há turmas, então a linha traz só escola e série', () => {
    semear(prova({ params: { ...prova().params, turmas: '' } }))
    renderProva()
    const gab = screen.getByRole('region', { name: /Gabarito/ })
    expect(within(gab).getByText('Escola Alfa · 7º ano')).toBeInTheDocument()
  })
})

describe('Prova — impressão', () => {
  it('Quando clica em "Imprimir / Salvar PDF", então chama window.print', async () => {
    semear()
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderProva()
    await userEvent.click(screen.getByRole('button', { name: /Imprimir \/ Salvar PDF/ }))
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('Mostra a dica sobre "Salvar como PDF" e "Cabeçalhos e rodapés"', () => {
    semear()
    renderProva()
    expect(screen.getByText(/Salvar como PDF.*Cabeçalhos e rodapés/)).toBeInTheDocument()
  })

  it('document.title vira o título da prova e volta para "Provario" ao sair da tela', async () => {
    semear()
    const router = renderProva()
    expect(document.title).toBe('Avaliação de Ciências — 7º ano')
    await act(() => router.navigate('/perfis'))
    await waitFor(() => expect(document.title).toBe('Provario'))
  })

  it('A interface fica fora da impressão e a folha não', () => {
    semear()
    renderProva('e1', { aviso: 'Prova gerada!' })
    expect(screen.getByRole('navigation', { name: 'Principal' })).toHaveClass('print:hidden')
    expect(screen.getAllByRole('banner')[0]).toHaveClass('print:hidden')
    expect(screen.getByRole('contentinfo')).toHaveClass('print:hidden')
    expect(escondidoNaImpressao(screen.getByRole('button', { name: /Imprimir/ }))).toBe(true)
    expect(escondidoNaImpressao(screen.getByRole('link', { name: /Gerar outra prova/ }))).toBe(true)
    expect(escondidoNaImpressao(screen.getByText('Prova gerada!'))).toBe(true)
    expect(escondidoNaImpressao(screen.getByRole('heading', { level: 1 }))).toBe(true)

    expect(escondidoNaImpressao(screen.getByRole('article', { name: 'Prova' }))).toBe(false)
    expect(escondidoNaImpressao(screen.getByRole('region', { name: /Gabarito/ }))).toBe(false)
  })
})

describe('Prova — não encontrada', () => {
  it('Dado um id inexistente, então mostra o erro e o link para gerar prova', () => {
    renderProva('nao-existe')
    expect(screen.getByRole('alert')).toHaveTextContent('Prova não encontrada')
    expect(screen.getByRole('link', { name: 'Gerar uma nova prova' })).toHaveAttribute('href', '/provas/nova')
  })
})
