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

  it('Então Turma, Data e Nota ficam numa faixa própria, separada da faixa Aluno(a)/Nº', () => {
    semear()
    renderProva()
    const cab = within(screen.getByRole('article', { name: 'Prova' })).getByRole('banner')
    const faixa = (rotulo: string) => within(cab).getByText(rotulo).parentElement!.parentElement!
    expect(faixa('Aluno(a)')).toBe(faixa('Nº'))
    expect(faixa('Turma')).toBe(faixa('Data'))
    expect(faixa('Turma')).toBe(faixa('Nota'))
    expect(faixa('Turma')).not.toBe(faixa('Aluno(a)'))
    expect(faixa('Turma')).toHaveClass('border-t-2')
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

function lerSalvo(): Exam {
  return (JSON.parse(localStorage.getItem('provario:exams')!) as ExamsData).provas[0]
}

function semearChave(chave = 'chave-teste') {
  localStorage.setItem('provario:settings', JSON.stringify({ version: 1, geminiApiKey: chave }))
}

function mockFetch(impl: typeof fetch) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

const respostaQuestao = (over: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  enunciado: 'Pergunta regerada?',
                  alternativas: ['r1', 'r2', 'r3', 'r4', 'r5'],
                  correta: 'E',
                  ...over,
                }),
              },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    }),
    { status: 200 },
  )

const enunciado = (n: number) => screen.getByRole('textbox', { name: `Enunciado da questão ${n}` })
const alternativa = (n: number, letra: string) =>
  screen.getByRole('textbox', { name: `Alternativa ${letra} da questão ${n}` })
const gabarito = () =>
  within(screen.getByRole('region', { name: /Gabarito/ }))
    .getAllByRole('listitem')
    .map((li) => li.textContent)

async function entrarEmEdicao() {
  await userEvent.click(screen.getByRole('button', { name: 'Editar prova' }))
}

async function reescrever(campo: HTMLElement, texto: string) {
  await userEvent.clear(campo)
  await userEvent.type(campo, texto)
}

describe('Prova — modo edição', () => {
  it('Quando clica em "Editar prova", então mostra enunciados e alternativas preenchidos no lugar da folha', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()

    expect(enunciado(1)).toHaveValue('Pergunta 1 sobre células?')
    expect(alternativa(3, 'c')).toHaveValue('Opção 3.3')
    expect(screen.getByRole('radio', { name: 'Marcar alternativa c como correta da questão 3' })).toBeChecked()
    expect(screen.queryByRole('article', { name: 'Prova' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Imprimir/ })).toBeDisabled()
  })

  it('Dado que editou, quando clica em "Descartar" e confirma, então o salvo não muda', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await reescrever(enunciado(1), 'Texto descartado')
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar alterações' }))

    expect(screen.getByRole('article', { name: 'Prova' })).toHaveTextContent('Pergunta 1 sobre células?')
    expect(lerSalvo()).toEqual(prova())
  })

  it('Dado que não editou nada, quando clica em "Descartar", então volta sem pedir confirmação', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Prova' })).toBeInTheDocument()
  })

  it('Dado que editou enunciado e alternativa, quando salva, então grava, atualiza atualizadoEm e a folha mostra o texto', async () => {
    semear()
    const router = renderProva()
    await entrarEmEdicao()
    await reescrever(enunciado(2), '  Novo enunciado?  ')
    await reescrever(alternativa(2, 'a'), 'Nova opção')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    const salvo = lerSalvo()
    expect(salvo.questoes[1].enunciado).toBe('Novo enunciado?')
    expect(salvo.questoes[1].alternativas[0]).toBe('Nova opção')
    expect(salvo.atualizadoEm).not.toBe('2026-03-10T10:00:00.000Z')
    expect(salvo.criadoEm).toBe('2026-03-10T10:00:00.000Z')
    expect(screen.getByText('Alterações salvas.')).toBeInTheDocument()
    const folha = screen.getByRole('article', { name: 'Prova' })
    expect(within(folha).getByText('2. Novo enunciado?')).toBeInTheDocument()
    expect(within(folha).getByText('a) Nova opção')).toBeInTheDocument()

    // recarregar (remontar a rota) mantém
    cleanup()
    router.dispose()
    renderProva()
    expect(screen.getByText('2. Novo enunciado?')).toBeInTheDocument()
  })

  it('Quando troca a alternativa correta e salva, então a célula do gabarito muda', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(screen.getByRole('radio', { name: 'Marcar alternativa e como correta da questão 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(lerSalvo().questoes[0].correta).toBe(4)
    expect(gabarito()).toEqual(['1 – e', '2 – b', '3 – c', '4 – d', '5 – e'])
  })

  it('Quando exclui uma questão e confirma, então renumera questões e gabarito', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(screen.getAllByRole('button', { name: /Excluir questão 2/ })[0])
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir questão' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(lerSalvo().questoes).toHaveLength(4)
    const lista = within(screen.getByRole('article', { name: 'Prova' })).getByRole('list', { name: 'Questões' })
    const itens = within(lista).getAllByRole('listitem').filter((li) => li.parentElement === lista)
    expect(itens).toHaveLength(4)
    expect(screen.getByText('2. Pergunta 3 sobre células?')).toBeInTheDocument()
    expect(screen.queryByText(/Pergunta 2 sobre/)).not.toBeInTheDocument()
    expect(gabarito()).toEqual(['1 – a', '2 – c', '3 – d', '4 – e'])
  })

  it('Cancelar a exclusão mantém a questão', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(screen.getByRole('button', { name: /Excluir questão 1/ }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))
    expect(enunciado(1)).toHaveValue('Pergunta 1 sobre células?')
    expect(screen.getAllByRole('textbox', { name: /^Enunciado da questão/ })).toHaveLength(5)
  })

  it('Dado que sobrou uma questão, então "Excluir questão" fica desabilitado', async () => {
    const uma = prova().questoes.slice(0, 1)
    semear(prova({ questoes: uma }))
    renderProva()
    await entrarEmEdicao()
    expect(screen.getByRole('button', { name: /Excluir questão 1/ })).toBeDisabled()
  })

  it('Dado enunciado vazio, quando salva, então mostra erro inline, foca o campo e não grava', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.clear(enunciado(3))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(screen.getByText('Escreva o enunciado.')).toBeInTheDocument()
    expect(enunciado(3)).toHaveFocus()
    expect(enunciado(3)).toHaveAttribute('aria-invalid', 'true')
    expect(lerSalvo()).toEqual(prova())
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument()
  })

  it('Dado alternativas repetidas, quando salva, então mostra erro e não grava', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await reescrever(alternativa(1, 'b'), 'OPÇÃO 1.1')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(screen.getByText('Há alternativas repetidas.')).toBeInTheDocument()
    expect(lerSalvo()).toEqual(prova())
  })

  it('Dado alternativa vazia, quando salva, então mostra erro na alternativa e não grava', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.clear(alternativa(4, 'd'))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(screen.getByText('Preencha esta alternativa.')).toBeInTheDocument()
    expect(alternativa(4, 'd')).toHaveFocus()
    expect(lerSalvo()).toEqual(prova())
  })

  it('Dado armazenamento cheio, quando salva, então mostra erro e continua editando', async () => {
    semear()
    semearChave()
    renderProva()
    await entrarEmEdicao()
    await reescrever(enunciado(1), 'Mudou')
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError')
    })
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    setItem.mockRestore()

    expect(screen.getByRole('alert')).toHaveTextContent(/armazenamento do navegador está cheio/)
    expect(enunciado(1)).toHaveValue('Mudou')
  })

  it('Dado alterações pendentes, quando tenta sair, então pede confirmação e permite continuar editando', async () => {
    semear()
    const router = renderProva()
    await entrarEmEdicao()
    await reescrever(enunciado(1), 'Mudou')
    await act(() => router.navigate('/perfis'))

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Sair sem salvar?')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(router.state.location.pathname).toBe('/provas/e1')
    expect(enunciado(1)).toHaveValue('Mudou')

    await act(() => router.navigate('/perfis'))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Sair sem salvar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/perfis'))
    expect(lerSalvo()).toEqual(prova())
  })

  it('Dado que não há alterações, quando sai, então não pede confirmação', async () => {
    semear()
    const router = renderProva()
    await entrarEmEdicao()
    await act(() => router.navigate('/perfis'))
    expect(router.state.location.pathname).toBe('/perfis')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('Prova — título editável', () => {
  const campoTitulo = () => screen.getByLabelText(/^Título da prova/)

  it('Quando entra em edição, mostra o campo de título preenchido', async () => {
    semear()
    renderProva()
    expect(screen.queryByLabelText(/^Título da prova/)).toBeNull()
    await entrarEmEdicao()
    expect(campoTitulo()).toHaveValue('Avaliação de Ciências — 7º ano')
  })

  it('Quando edita o título e salva, persiste o título e a folha mostra o novo', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await reescrever(campoTitulo(), '  Prova do 2º bimestre  ')
    await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }))

    expect(lerSalvo().titulo).toBe('Prova do 2º bimestre')
    expect(lerSalvo().atualizadoEm).not.toBe(prova().atualizadoEm)
    expect(screen.getByRole('heading', { level: 1, name: 'Prova do 2º bimestre' })).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Prova' })).getByRole('heading', { name: /Prova do 2º bimestre/ })).toBeInTheDocument()
    expect(document.title).toBe('Prova do 2º bimestre')
  })

  it('Dado título vazio, não salva, mostra o erro e leva o foco ao campo', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await reescrever(campoTitulo(), '   ')
    await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }))

    expect(screen.getByText('Informe o título da prova.')).toBeInTheDocument()
    expect(campoTitulo()).toHaveFocus()
    expect(lerSalvo()).toEqual(prova())
  })

  it('o erro do título tem prioridade de foco sobre o das questões', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.clear(enunciado(1))
    await userEvent.clear(campoTitulo())
    await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }))
    expect(campoTitulo()).toHaveFocus()
  })

  it('Dado que mudou só o título, quando tenta sair, pede confirmação', async () => {
    semear()
    const router = renderProva()
    await entrarEmEdicao()
    await reescrever(campoTitulo(), 'Outro título')
    await act(() => router.navigate('/perfis'))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Sair sem salvar?')
    expect(router.state.location.pathname).toBe('/provas/e1')
  })

  it('Dado que só mudou o título, "Descartar" pede confirmação e restaura o título', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await reescrever(campoTitulo(), 'Outro título')
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar alterações' }))
    expect(lerSalvo()).toEqual(prova())
    expect(screen.getByRole('heading', { level: 1, name: 'Avaliação de Ciências — 7º ano' })).toBeInTheDocument()
  })

  it('ao editar de novo depois de descartar, o campo volta ao título salvo', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await reescrever(campoTitulo(), 'Outro título')
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar alterações' }))
    await entrarEmEdicao()
    expect(campoTitulo()).toHaveValue('Avaliação de Ciências — 7º ano')
  })
})

describe('Prova — regerar questão', () => {
  it('Quando regera, então manda as demais questões, troca só aquela e o gabarito, e "Desfazer" restaura', async () => {
    semear()
    semearChave()
    const fn = mockFetch(async () => respostaQuestao())
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(screen.getByRole('button', { name: /Regerar questão 2/ }))

    await waitFor(() => expect(enunciado(2)).toHaveValue('Pergunta regerada?'))
    const prompt = JSON.parse(fn.mock.calls[0][1]!.body as string).contents[0].parts[0].text as string
    expect(prompt).toContain('Pergunta 1 sobre células?')
    expect(prompt).toContain('Pergunta 2 sobre células?')
    expect(prompt).toContain('Pergunta 5 sobre células?')
    expect(enunciado(1)).toHaveValue('Pergunta 1 sobre células?')
    expect(enunciado(3)).toHaveValue('Pergunta 3 sobre células?')
    expect(screen.getByRole('radio', { name: 'Marcar alternativa e como correta da questão 2' })).toBeChecked()
    expect(screen.getByText('Questão 2 regerada.')).toBeInTheDocument()
    expect(lerSalvo()).toEqual(prova()) // ainda é só rascunho

    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(enunciado(2)).toHaveValue('Pergunta 2 sobre células?')
    expect(alternativa(2, 'a')).toHaveValue('Opção 2.1')
    expect(screen.getByRole('radio', { name: 'Marcar alternativa b como correta da questão 2' })).toBeChecked()
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument()
  })

  it('Dado que regerou e salvou, então a prova e o gabarito refletem a nova questão', async () => {
    semear()
    semearChave()
    mockFetch(async () => respostaQuestao())
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(screen.getByRole('button', { name: /Regerar questão 2/ }))
    await waitFor(() => expect(enunciado(2)).toHaveValue('Pergunta regerada?'))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(screen.getByText('2. Pergunta regerada?')).toBeInTheDocument()
    expect(gabarito()).toEqual(['1 – a', '2 – e', '3 – c', '4 – d', '5 – e'])
  })

  it('Enquanto regera, mostra "Regerando…" e desabilita as ações', async () => {
    semear()
    semearChave()
    let liberar!: (r: Response) => void
    mockFetch(() => new Promise<Response>((resolve) => (liberar = resolve)))
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(screen.getByRole('button', { name: /Regerar questão 1/ }))

    expect(screen.getByRole('status')).toHaveTextContent('Regerando…')
    expect(screen.getByRole('button', { name: /Regerar questão 3/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
    await act(async () => liberar(respostaQuestao()))
    await waitFor(() => expect(screen.queryByText('Regerando…')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Regerar questão 3/ })).toBeEnabled()
  })

  it('Dado falha da API, então mostra o erro e não mexe na questão', async () => {
    semear()
    semearChave()
    mockFetch(async () => new Response('{}', { status: 429 }))
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(screen.getByRole('button', { name: /Regerar questão 2/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Limite do plano gratuito')
    expect(enunciado(2)).toHaveValue('Pergunta 2 sobre células?')
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument()
  })

  it('Dado que não há chave do Gemini, então "Regerar questão" fica desabilitado e há link para Configurações', async () => {
    semear()
    const fn = mockFetch(async () => respostaQuestao())
    renderProva()
    await entrarEmEdicao()

    for (let n = 1; n <= 5; n++) expect(screen.getByRole('button', { name: new RegExp(`Regerar questão ${n}`) })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Ir para Configurações' })).toHaveAttribute('href', '/configuracoes')
    expect(fn).not.toHaveBeenCalled()
  })

  it('Regerar usa o texto do rascunho (o que a professora vê), não o salvo', async () => {
    semear()
    semearChave()
    const fn = mockFetch(async () => respostaQuestao())
    renderProva()
    await entrarEmEdicao()
    await reescrever(enunciado(1), 'Texto editado e ainda não salvo')
    await userEvent.click(screen.getByRole('button', { name: /Regerar questão 3/ }))
    await waitFor(() => expect(fn).toHaveBeenCalled())
    const prompt = JSON.parse(fn.mock.calls[0][1]!.body as string).contents[0].parts[0].text as string
    expect(prompt).toContain('Texto editado e ainda não salvo')
  })
})

const questaoColada = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    enunciado: 'Pergunta colada?',
    alternativas: ['m1', 'm2', 'm3', 'm4', 'm5'],
    correta: 'D',
    ...over,
  })

const cartao = (n: number) => screen.getByRole('region', { name: `Questão ${n}` })
const painelManual = (n: number) => screen.getByRole('region', { name: `Regerar a questão ${n} com outra IA` })
const botaoManual = (n: number) => screen.getByRole('button', { name: `Regerar com outra IA a questão ${n}` })

async function colarNoPainel(n: number, texto: string) {
  await userEvent.click(within(painelManual(n)).getByLabelText(/Resposta da IA/))
  await userEvent.paste(texto)
}

describe('Prova — regerar com outra IA (copiar e colar)', () => {
  it('Dado que não há chave, quando regera a questão 2 colando uma questão válida, então troca só a 2 e o gabarito muda ao salvar', async () => {
    semear()
    const fn = mockFetch(async () => respostaQuestao())
    renderProva()
    await entrarEmEdicao()

    expect(screen.getByRole('button', { name: /Regerar questão 2/ })).toBeDisabled()
    expect(botaoManual(2)).toBeEnabled()
    await userEvent.click(botaoManual(2))

    const painel = painelManual(2)
    expect(cartao(2)).toContainElement(painel)
    const prompt = (within(painel).getByLabelText('Prompt') as HTMLTextAreaElement).value
    for (let i = 1; i <= 5; i++) expect(prompt).toContain(`Pergunta ${i} sobre células?`)
    expect(prompt).toContain('exatamente 5 alternativas')
    expect(prompt).toContain('Responda apenas com um objeto JSON')

    await colarNoPainel(2, `Segue a questão:\n${questaoColada()}`)
    await userEvent.click(within(painel).getByRole('button', { name: 'Trocar questão' }))

    expect(screen.queryByRole('region', { name: /com outra IA/ })).not.toBeInTheDocument()
    expect(enunciado(2)).toHaveValue('Pergunta colada?')
    expect(alternativa(2, 'a')).toHaveValue('m1')
    expect(screen.getByRole('radio', { name: 'Marcar alternativa d como correta da questão 2' })).toBeChecked()
    for (const n of [1, 3, 4, 5]) expect(enunciado(n)).toHaveValue(`Pergunta ${n} sobre células?`)
    expect(screen.getByText('Questão 2 regerada.')).toBeInTheDocument()
    expect(lerSalvo()).toEqual(prova()) // ainda é só rascunho

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(screen.getByText('2. Pergunta colada?')).toBeInTheDocument()
    expect(gabarito()).toEqual(['1 – a', '2 – d', '3 – c', '4 – d', '5 – e'])
    expect(lerSalvo().questoes[1]).toEqual({ enunciado: 'Pergunta colada?', alternativas: ['m1', 'm2', 'm3', 'm4', 'm5'], correta: 3 })
    expect(lerSalvo().modelo).toBe('gemini') // a regeração não muda a origem da prova
    expect(fn).not.toHaveBeenCalled()
  })

  it('"Desfazer" volta a questão anterior', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(botaoManual(3))
    await colarNoPainel(3, questaoColada())
    await userEvent.click(within(painelManual(3)).getByRole('button', { name: 'Trocar questão' }))
    expect(enunciado(3)).toHaveValue('Pergunta colada?')

    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(enunciado(3)).toHaveValue('Pergunta 3 sobre células?')
    expect(alternativa(3, 'a')).toHaveValue('Opção 3.1')
    expect(screen.getByRole('radio', { name: 'Marcar alternativa c como correta da questão 3' })).toBeChecked()
  })

  it('Quando cola uma questão repetida, mostra o erro, mantém o texto e não troca', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(botaoManual(2))
    const colado = questaoColada({ enunciado: 'pergunta 4 sobre células?' })
    await colarNoPainel(2, colado)
    await userEvent.click(within(painelManual(2)).getByRole('button', { name: 'Trocar questão' }))

    expect(within(painelManual(2)).getByText('A questão nova repete uma que já está na prova.')).toBeInTheDocument()
    expect(within(painelManual(2)).getByLabelText(/Resposta da IA/)).toHaveValue(colado)
    expect(enunciado(2)).toHaveValue('Pergunta 2 sobre células?')
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument()
  })

  it('Quando cola uma questão com nº errado de alternativas, explica o motivo', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(botaoManual(1))
    await colarNoPainel(1, questaoColada({ alternativas: ['a', 'b', 'c', 'd'] }))
    await userEvent.click(within(painelManual(1)).getByRole('button', { name: 'Trocar questão' }))
    expect(within(painelManual(1)).getByText(/não tem 5 alternativas/)).toBeInTheDocument()
  })

  it('Dado erro de regeração pelo Gemini, o aviso oferece regerar aquela questão com outra IA', async () => {
    semear()
    semearChave()
    mockFetch(async () => new Response('{}', { status: 503 }))
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(screen.getByRole('button', { name: /Regerar questão 4/ }))

    const erro = await screen.findByRole('alert')
    expect(erro).toHaveTextContent('sobrecarregado')
    await userEvent.click(within(erro).getByRole('button', { name: 'Regerar com outra IA' }))
    expect(cartao(4)).toContainElement(painelManual(4))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Dado que não há chave, o aviso explica as duas formas de regerar', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Para regerar com o Gemini, configure a chave. Ir para Configurações Você também pode regerar com outra IA (copiar e colar).',
    )
  })

  it('"Cancelar" fecha o painel sem mexer na questão', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(botaoManual(2))
    await userEvent.click(within(painelManual(2)).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('region', { name: /com outra IA/ })).not.toBeInTheDocument()
    expect(enunciado(2)).toHaveValue('Pergunta 2 sobre células?')
  })

  it('O painel fecha ao excluir uma questão', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(botaoManual(2))
    await userEvent.click(screen.getByRole('button', { name: /Excluir questão 1/ }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir questão' }))
    expect(screen.queryByRole('region', { name: /com outra IA/ })).not.toBeInTheDocument()
  })

  it('O painel fecha ao regerar com o Gemini', async () => {
    semear()
    semearChave()
    mockFetch(async () => respostaQuestao())
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(botaoManual(2))
    await userEvent.click(screen.getByRole('button', { name: /Regerar questão 3/ }))
    expect(screen.queryByRole('region', { name: /com outra IA/ })).not.toBeInTheDocument()
    await waitFor(() => expect(enunciado(3)).toHaveValue('Pergunta regerada?'))
  })

  it('Salvar com o painel aberto grava o rascunho como está e fecha o painel', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await reescrever(enunciado(1), 'Mudou')
    await userEvent.click(botaoManual(2))
    await colarNoPainel(2, questaoColada())
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(lerSalvo().questoes[0].enunciado).toBe('Mudou')
    expect(lerSalvo().questoes[1].enunciado).toBe('Pergunta 2 sobre células?')
    expect(screen.getByText('Alterações salvas.')).toBeInTheDocument()

    await entrarEmEdicao()
    expect(screen.queryByRole('region', { name: /com outra IA/ })).not.toBeInTheDocument()
  })

  it('O painel fecha ao descartar', async () => {
    semear()
    renderProva()
    await entrarEmEdicao()
    await userEvent.click(botaoManual(2))
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    await entrarEmEdicao()
    expect(screen.queryByRole('region', { name: /com outra IA/ })).not.toBeInTheDocument()
  })
})

describe('Prova — colunas da folha', () => {
  const lerExame = () => (JSON.parse(localStorage.getItem('provario:exams')!) as ExamsData).provas[0]
  const seletor = () => screen.getByRole('group', { name: 'Colunas da folha' })

  it('Dada uma prova sem colunas, então marca "1 coluna" e a folha tem data-colunas="1"', () => {
    semear()
    renderProva()
    expect(within(seletor()).getByRole('radio', { name: '1 coluna' })).toBeChecked()
    expect(within(seletor()).getByRole('radio', { name: '2 colunas' })).not.toBeChecked()
    const folha = screen.getByRole('article', { name: 'Prova' })
    expect(folha).toHaveAttribute('data-colunas', '1')
    expect(within(folha).getByRole('list', { name: 'Questões' })).not.toHaveClass('print:columns-2')
  })

  it('Quando escolhe "2 colunas", então grava, atualiza atualizadoEm e a lista ganha as classes de duas colunas', async () => {
    semear()
    renderProva()
    await userEvent.click(within(seletor()).getByRole('radio', { name: '2 colunas' }))

    const salvo = lerExame()
    expect(salvo.colunas).toBe(2)
    expect(salvo.atualizadoEm).not.toBe('2026-03-10T10:00:00.000Z')
    const folha = screen.getByRole('article', { name: 'Prova' })
    expect(folha).toHaveAttribute('data-colunas', '2')
    const lista = within(folha).getByRole('list', { name: 'Questões' })
    expect(lista).toHaveClass('sm:columns-2', 'print:columns-2')
    expect(within(seletor()).getByRole('radio', { name: '2 colunas' })).toBeChecked()
    for (const li of within(lista).getAllByRole('listitem').filter((l) => l.parentElement === lista)) {
      expect(li).toHaveClass('break-inside-avoid')
    }
  })

  it('Quando volta para "1 coluna", então grava colunas: 1', async () => {
    semear(prova({ colunas: 2 }))
    renderProva()
    await userEvent.click(within(seletor()).getByRole('radio', { name: '1 coluna' }))
    expect(lerExame().colunas).toBe(1)
    expect(screen.getByRole('article', { name: 'Prova' })).toHaveAttribute('data-colunas', '1')
  })

  it('Durante a edição, o seletor fica desabilitado', async () => {
    semear()
    renderProva()
    await userEvent.click(screen.getByRole('button', { name: 'Editar prova' }))
    expect(seletor()).toBeDisabled()
  })

  it('Com o armazenamento cheio, a troca mostra o erro e não grava', async () => {
    semear()
    renderProva()
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError')
    })
    await userEvent.click(within(seletor()).getByRole('radio', { name: '2 colunas' }))
    setItem.mockRestore()

    expect(screen.getByRole('alert')).toHaveTextContent(/armazenamento do navegador está cheio/)
    expect(lerExame().colunas).toBeUndefined()
    expect(screen.getByRole('article', { name: 'Prova' })).toHaveAttribute('data-colunas', '1')
  })

  it('O gabarito não muda com duas colunas', () => {
    semear(prova({ colunas: 2 }))
    renderProva()
    const gabarito = screen.getByRole('region', { name: /Gabarito/ })
    expect(gabarito.className).not.toMatch(/columns-/)
    expect(within(gabarito).getAllByRole('listitem')).toHaveLength(5)
  })
})
