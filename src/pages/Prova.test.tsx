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
