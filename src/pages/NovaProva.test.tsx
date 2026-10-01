import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExamsData } from '../lib/exams'
import type { Profile, ProfilesData } from '../lib/profiles'
import { routes } from '../router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
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

function semearPerfis(...perfis: Partial<Profile>[]) {
  const data: ProfilesData = { version: 1, perfis: perfis.map(perfil) }
  localStorage.setItem('provario:profiles', JSON.stringify(data))
}

function semearChave(chave = 'chave-teste') {
  localStorage.setItem('provario:settings', JSON.stringify({ version: 1, geminiApiKey: chave }))
}

function provasSalvas() {
  const raw = localStorage.getItem('provario:exams')
  return raw ? (JSON.parse(raw) as ExamsData).provas : []
}

function mockFetch(impl: typeof fetch) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

function respostaGemini(quantidade: number, alternativas: number) {
  const questoes = Array.from({ length: quantidade }, (_, i) => ({
    enunciado: `Pergunta ${i + 1} sobre células?`,
    alternativas: Array.from({ length: alternativas }, (_, j) => `Opção ${i + 1}.${j + 1}`),
    correta: String.fromCharCode(65 + (i % alternativas)),
  }))
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ questoes }) }] } }] }),
    { status: 200 },
  )
}

const foraDoFormato = () =>
  new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"questoes": []}' }] } }] }),
    { status: 200 },
  )

function ambienteCompleto() {
  semearPerfis({ id: 'p1', nome: 'Manhã', escola: 'Escola Alfa', professora: 'Ana' })
  semearChave()
}

async function preencherConteudo(texto = 'Organelas celulares') {
  await userEvent.type(screen.getByLabelText(/Conteúdo/), texto)
}

const botaoGerar = () => screen.getByRole('button', { name: /Gerar prova|Gerando/ })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Nova prova — pré-condições', () => {
  it('Dado que não há perfis, então mostra aviso com link para cadastrar e botão desabilitado', () => {
    semearChave()
    renderAt('/provas/nova')
    expect(screen.getByRole('link', { name: /cadastrar um perfil/i })).toHaveAttribute('href', '/perfis/novo')
    expect(botaoGerar()).toBeDisabled()
  })

  it('Dado que não há chave, então mostra aviso com link para Configurações e botão desabilitado', () => {
    semearPerfis({ id: 'p1', nome: 'Manhã' })
    renderAt('/provas/nova')
    const aviso = screen.getByRole('alert')
    expect(within(aviso).getByRole('link', { name: /Configurações/ })).toHaveAttribute('href', '/configuracoes')
    expect(botaoGerar()).toBeDisabled()
  })

  it('a aba "Provas" fica ativa no formulário', () => {
    ambienteCompleto()
    renderAt('/provas/nova')
    expect(screen.getByRole('link', { name: 'Provas' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('Nova prova — validação', () => {
  it('Quando conteúdo está vazio e quantidade é 25, então mostra erros em pt-BR e não chama o Gemini', async () => {
    ambienteCompleto()
    const fn = mockFetch(async () => respostaGemini(1, 4))
    renderAt('/provas/nova')

    const qtd = screen.getByLabelText(/Quantidade/)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '25')
    await userEvent.click(botaoGerar())

    const conteudo = screen.getByLabelText(/Conteúdo/)
    expect(conteudo).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Descreva o conteúdo que a prova deve cobrir.')).toBeInTheDocument()
    expect(qtd).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Informe um número inteiro de 1 a 20.')).toBeInTheDocument()
    expect(conteudo).toHaveFocus()
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('Nova prova — geração', () => {
  it('Quando gera 5 questões com 5 alternativas, então abre a prova com a)–e) e gabarito e salva com o snapshot do perfil', async () => {
    ambienteCompleto()
    const fn = mockFetch(async () => respostaGemini(5, 5))
    const router = renderAt('/provas/nova')

    await preencherConteudo()
    const qtd = screen.getByLabelText(/Quantidade/)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '5')
    await userEvent.click(screen.getByRole('radio', { name: /5 alternativas/ }))
    await userEvent.click(botaoGerar())

    await screen.findByRole('heading', { level: 1, name: 'Avaliação de Ciências — 7º ano' })
    expect(router.state.location.pathname).toMatch(/^\/provas\/[^/]+$/)
    expect(screen.getByRole('status')).toHaveTextContent('Prova gerada e salva.')
    expect(fn).toHaveBeenCalledTimes(1)

    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`${i}. Pergunta ${i} sobre células?`)).toBeInTheDocument()
    }
    expect(screen.getAllByText(/^e\) Opção/)).toHaveLength(5) // alternativa e) em cada questão
    const gabarito = screen.getByRole('region', { name: /Gabarito/ })
    expect(within(gabarito).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1 – a',
      '2 – b',
      '3 – c',
      '4 – d',
      '5 – e',
    ])

    const salvas = provasSalvas()
    expect(salvas).toHaveLength(1)
    expect(salvas[0].perfil).toMatchObject({ id: 'p1', nome: 'Manhã', escola: 'Escola Alfa', professora: 'Ana' })
    expect(salvas[0].questoes).toHaveLength(5)
    expect(salvas[0].params.conteudo).toBe('Organelas celulares')
    expect(salvas[0].modelo).toBeTruthy()
  })

  it('a prova continua disponível depois de recarregar a página', async () => {
    ambienteCompleto()
    mockFetch(async () => respostaGemini(2, 4))
    const router = renderAt('/provas/nova')
    const qtd = screen.getByLabelText(/Quantidade/)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '2')
    await preencherConteudo()
    await userEvent.click(botaoGerar())
    await screen.findByRole('region', { name: /Gabarito/ })
    const caminho = router.state.location.pathname

    cleanup() // recarregar a página
    renderAt(caminho)
    expect(screen.getByText('1. Pergunta 1 sobre células?')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Gabarito/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Provas' })).toHaveAttribute('aria-current', 'page')
  })

  it('Quando o perfil é excluído depois, a prova mantém o snapshot', async () => {
    ambienteCompleto()
    mockFetch(async () => respostaGemini(1, 4))
    const router = renderAt('/provas/nova')
    const qtd = screen.getByLabelText(/Quantidade/)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '1')
    await preencherConteudo()
    await userEvent.click(botaoGerar())
    await screen.findByRole('region', { name: /Gabarito/ })
    const caminho = router.state.location.pathname

    cleanup()
    localStorage.removeItem('provario:profiles')
    renderAt(caminho)
    expect(within(screen.getByRole('article', { name: 'Prova' })).getByText('Escola Alfa')).toBeInTheDocument()
  })

  it('Enquanto gera, o botão fica desabilitado com "Gerando…" e os campos travados', async () => {
    ambienteCompleto()
    let liberar!: (r: Response) => void
    mockFetch(() => new Promise<Response>((resolve) => (liberar = resolve)))
    renderAt('/provas/nova')
    const qtd = screen.getByLabelText(/Quantidade/)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '1')
    await preencherConteudo()
    await userEvent.click(botaoGerar())

    const botao = await screen.findByRole('button', { name: 'Gerando…' })
    expect(botao).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Isso pode levar até um minuto.')
    expect(screen.getByLabelText(/Conteúdo/)).toBeDisabled()

    liberar(respostaGemini(1, 4))
    await screen.findByRole('region', { name: /Gabarito/ })
  })

  it('Quando a IA responde fora do formato duas vezes, mostra erro claro, mantém o formulário e não salva nada', async () => {
    ambienteCompleto()
    const fn = mockFetch(async () => foraDoFormato())
    renderAt('/provas/nova')
    await preencherConteudo('Fotossíntese')
    await userEvent.click(botaoGerar())

    const erro = await screen.findByRole('alert')
    expect(erro).toHaveTextContent('A IA devolveu uma prova fora do formato esperado')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText(/Conteúdo/)).toHaveValue('Fotossíntese')
    expect(botaoGerar()).toBeEnabled()
    expect(provasSalvas()).toEqual([])
  })

  it('Quando o Gemini responde 429, mostra a mensagem de limite do plano gratuito', async () => {
    ambienteCompleto()
    mockFetch(async () => new Response(JSON.stringify({ error: {} }), { status: 429 }))
    renderAt('/provas/nova')
    await preencherConteudo()
    await userEvent.click(botaoGerar())
    expect(await screen.findByRole('alert')).toHaveTextContent('Limite do plano gratuito')
    expect(provasSalvas()).toEqual([])
  })

  it('Quando o armazenamento está cheio, avisa e não navega', async () => {
    ambienteCompleto()
    mockFetch(async () => respostaGemini(10, 4))
    renderAt('/provas/nova')
    await preencherConteudo()
    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === 'provario:exams') throw new DOMException('cheio', 'QuotaExceededError')
      return original.call(this, k, v)
    })
    await userEvent.click(botaoGerar())
    expect(await screen.findByRole('alert')).toHaveTextContent('armazenamento do navegador está cheio')
    expect(screen.getByLabelText(/Conteúdo/)).toHaveValue('Organelas celulares')
  })

  it('Na próxima visita, os parâmetros voltam preenchidos, exceto conteúdo, título e observações', async () => {
    semearPerfis({ id: 'p1', nome: 'Manhã' }, { id: 'p2', nome: 'Tarde' })
    semearChave()
    mockFetch(async () => respostaGemini(3, 5))
    renderAt('/provas/nova')

    await userEvent.selectOptions(screen.getByLabelText(/^Perfil/), 'p2')
    await userEvent.selectOptions(screen.getByLabelText(/Série/), '9º ano')
    await userEvent.clear(screen.getByLabelText(/Disciplina/))
    await userEvent.type(screen.getByLabelText(/Disciplina/), 'Biologia')
    await userEvent.type(screen.getByLabelText(/Turma/), '9º B')
    const qtd = screen.getByLabelText(/Quantidade/)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '3')
    await userEvent.click(screen.getByRole('radio', { name: /5 alternativas/ }))
    await userEvent.click(screen.getByRole('radio', { name: 'Difícil' }))
    await preencherConteudo()
    await userEvent.type(screen.getByLabelText(/Título/), 'Prova 1')
    await userEvent.type(screen.getByLabelText(/Observações/), 'Use Santos')
    await userEvent.click(botaoGerar())
    await screen.findByRole('region', { name: /Gabarito/ })

    cleanup()
    renderAt('/provas/nova')
    expect(screen.getByLabelText(/^Perfil/)).toHaveValue('p2')
    expect(screen.getByLabelText(/Série/)).toHaveValue('9º ano')
    expect(screen.getByLabelText(/Disciplina/)).toHaveValue('Biologia')
    expect(screen.getByLabelText(/Turma/)).toHaveValue('9º B')
    expect(screen.getByLabelText(/Quantidade/)).toHaveValue(3)
    expect(screen.getByRole('radio', { name: /5 alternativas/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Difícil' })).toBeChecked()
    expect(screen.getByLabelText(/Conteúdo/)).toHaveValue('')
    expect(screen.getByLabelText(/Título/)).toHaveValue('')
    expect(screen.getByLabelText(/Observações/)).toHaveValue('')
  })

  it('título informado vira o título da prova e o enviado ao Gemini inclui as observações', async () => {
    ambienteCompleto()
    const fn = mockFetch(async () => respostaGemini(10, 4))
    renderAt('/provas/nova')
    await preencherConteudo()
    await userEvent.type(screen.getByLabelText(/Título/), 'Prova bimestral')
    await userEvent.type(screen.getByLabelText(/Observações/), 'Sem pegadinhas')
    await userEvent.click(botaoGerar())
    await screen.findByRole('heading', { level: 1, name: 'Prova bimestral' })
    const corpo = JSON.parse(fn.mock.calls[0][1]!.body as string)
    expect(corpo.contents[0].parts[0].text).toContain('Sem pegadinhas')
  })
})

const botaoManual = () => screen.getByRole('button', { name: 'Usar outra IA (copiar e colar)' })
const painelManual = () => screen.getByRole('region', { name: 'Gerar com outra IA (copiar e colar)' })

function respostaColada(quantidade: number, alternativas = 4) {
  return JSON.stringify({
    questoes: Array.from({ length: quantidade }, (_, i) => ({
      enunciado: `Pergunta colada ${i + 1}?`,
      alternativas: Array.from({ length: alternativas }, (_, j) => `Opção ${i + 1}.${j + 1}`),
      correta: String.fromCharCode(65 + (i % alternativas)),
    })),
  })
}

async function colarResposta(texto: string) {
  const caixa = within(painelManual()).getByLabelText(/Resposta da IA/)
  await userEvent.click(caixa)
  await userEvent.paste(texto)
}

describe('Nova prova — modo manual (outra IA)', () => {
  it('Dado que não há chave, quando usa outra IA, copia o prompt e cola um JSON válido, então salva a prova com modelo "manual" e abre', async () => {
    semearPerfis({ id: 'p1', nome: 'Manhã', escola: 'Escola Alfa', professora: 'Ana' })
    const fn = mockFetch(async () => respostaGemini(1, 4))
    const router = renderAt('/provas/nova')

    expect(botaoGerar()).toBeDisabled()
    expect(botaoManual()).toBeEnabled()
    await preencherConteudo()
    const qtd = screen.getByLabelText(/Quantidade/)
    await userEvent.clear(qtd)
    await userEvent.type(qtd, '3')
    await userEvent.click(botaoManual())

    const painel = painelManual()
    const prompt = within(painel).getByLabelText('Prompt') as HTMLTextAreaElement
    expect(prompt).toHaveAttribute('readonly')
    expect(prompt.value).toContain('Organelas celulares')
    expect(prompt.value).toContain('exatamente 3 questões')
    expect(prompt.value).toContain('Responda apenas com um objeto JSON')

    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await userEvent.click(within(painel).getByRole('button', { name: /Copiar/ }))
    expect(writeText).toHaveBeenCalledWith(prompt.value)
    expect(within(painel).getByRole('status')).toHaveTextContent('Prompt copiado.')

    await colarResposta(`Claro! Aqui está:\n\`\`\`json\n${respostaColada(3)}\n\`\`\``)
    await userEvent.click(within(painel).getByRole('button', { name: 'Montar prova' }))

    await screen.findByRole('heading', { level: 1, name: 'Avaliação de Ciências — 7º ano' })
    expect(router.state.location.pathname).toMatch(/^\/provas\/[^/]+$/)
    expect(screen.getByText('1. Pergunta colada 1?')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: /Gabarito/ })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1 – a',
      '2 – b',
      '3 – c',
    ])
    const salvas = provasSalvas()
    expect(salvas).toHaveLength(1)
    expect(salvas[0].modelo).toBe('manual')
    expect(salvas[0].perfil).toMatchObject({ id: 'p1', escola: 'Escola Alfa', professora: 'Ana' })
    expect(salvas[0].params).toMatchObject({ conteudo: 'Organelas celulares', quantidade: 3 })
    expect(fn).not.toHaveBeenCalled()
  })

  it('Quando cola 8 questões e eram 10, então mostra o motivo, mantém o texto colado e não salva', async () => {
    semearPerfis({ id: 'p1', nome: 'Manhã' })
    renderAt('/provas/nova')
    await preencherConteudo()
    await userEvent.click(botaoManual())
    const colado = respostaColada(8)
    await colarResposta(colado)
    await userEvent.click(within(painelManual()).getByRole('button', { name: 'Montar prova' }))

    const caixa = within(painelManual()).getByLabelText(/Resposta da IA/)
    expect(screen.getByText('Esperava 10 questões, mas vieram 8.')).toBeInTheDocument()
    expect(caixa).toHaveAttribute('aria-invalid', 'true')
    expect(caixa).toHaveAccessibleDescription(/Esperava 10 questões, mas vieram 8\./)
    expect(caixa).toHaveValue(colado)
    expect(provasSalvas()).toEqual([])

    // corrigir o texto tira o erro
    await userEvent.paste(' ')
    expect(screen.queryByText('Esperava 10 questões, mas vieram 8.')).not.toBeInTheDocument()
  })

  it('Quando cola um texto sem JSON, então explica e mantém o texto', async () => {
    semearPerfis({ id: 'p1', nome: 'Manhã' })
    renderAt('/provas/nova')
    await preencherConteudo()
    await userEvent.click(botaoManual())
    await colarResposta('Desculpe, não consegui.')
    await userEvent.click(within(painelManual()).getByRole('button', { name: 'Montar prova' }))
    expect(screen.getByText(/Não encontrei um JSON válido na resposta/)).toBeInTheDocument()
    expect(within(painelManual()).getByLabelText(/Resposta da IA/)).toHaveValue('Desculpe, não consegui.')
  })

  it('Dado formulário inválido, quando usa outra IA, então não abre o painel e foca o campo', async () => {
    semearPerfis({ id: 'p1', nome: 'Manhã' })
    renderAt('/provas/nova')
    await userEvent.click(botaoManual())
    expect(screen.queryByRole('region', { name: /outra IA/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Conteúdo/)).toHaveFocus()
    expect(screen.getByText('Descreva o conteúdo que a prova deve cobrir.')).toBeInTheDocument()
  })

  it('Dado que não há perfil, então "Usar outra IA" fica desabilitado', () => {
    renderAt('/provas/nova')
    expect(botaoManual()).toBeDisabled()
  })

  it('Com o painel aberto, o formulário fica travado e "Voltar aos parâmetros" destrava', async () => {
    ambienteCompleto()
    renderAt('/provas/nova')
    await preencherConteudo()
    await userEvent.click(botaoManual())

    expect(screen.getByLabelText(/Conteúdo/)).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Gerar prova/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Usar outra IA (copiar e colar)' })).not.toBeInTheDocument()

    await userEvent.click(within(painelManual()).getByRole('button', { name: 'Voltar aos parâmetros' }))
    expect(screen.queryByRole('region', { name: /outra IA/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Conteúdo/)).toBeEnabled()
    expect(screen.getByLabelText(/Conteúdo/)).toHaveValue('Organelas celulares')
    expect(botaoGerar()).toBeEnabled()
  })

  it('o painel tem links para ChatGPT, Claude e Gemini em nova aba', async () => {
    semearPerfis({ id: 'p1', nome: 'Manhã' })
    renderAt('/provas/nova')
    await preencherConteudo()
    await userEvent.click(botaoManual())
    const painel = painelManual()
    for (const [nome, href] of [
      ['ChatGPT', 'https://chatgpt.com'],
      ['Claude', 'https://claude.ai/new'],
      ['Gemini', 'https://gemini.google.com/app'],
    ]) {
      const link = within(painel).getByRole('link', { name: new RegExp(`^${nome}`) })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('Quando copiar falha, então seleciona o prompt e pede Ctrl+C', async () => {
    semearPerfis({ id: 'p1', nome: 'Manhã' })
    renderAt('/provas/nova')
    await preencherConteudo()
    await userEvent.click(botaoManual())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => Promise.reject(new Error('negado'))) },
      configurable: true,
    })
    const painel = painelManual()
    await userEvent.click(within(painel).getByRole('button', { name: /Copiar/ }))
    expect(await within(painel).findByText('Selecione o texto e copie com Ctrl+C.')).toBeInTheDocument()
    const prompt = within(painel).getByLabelText('Prompt') as HTMLTextAreaElement
    expect(prompt).toHaveFocus()
    expect([prompt.selectionStart, prompt.selectionEnd]).toEqual([0, prompt.value.length])
  })

  it('Dado que não há chave, o aviso também oferece usar outra IA', () => {
    semearPerfis({ id: 'p1', nome: 'Manhã' })
    renderAt('/provas/nova')
    expect(screen.getByRole('alert')).toHaveTextContent(/usar outra IA/i)
  })

  it('Quando o Gemini falha, o erro tem o botão que abre o painel com os mesmos parâmetros', async () => {
    ambienteCompleto()
    mockFetch(async () => new Response('{}', { status: 503 }))
    renderAt('/provas/nova')
    await preencherConteudo('Fotossíntese')
    await userEvent.type(screen.getByLabelText(/Observações/), 'Sem cálculos')
    await userEvent.click(botaoGerar())

    const erro = await screen.findByRole('alert')
    expect(erro).toHaveTextContent('sobrecarregado')
    await userEvent.click(within(erro).getByRole('button', { name: 'Usar outra IA (copiar e colar)' }))

    const prompt = within(painelManual()).getByLabelText('Prompt') as HTMLTextAreaElement
    expect(prompt.value).toContain('Fotossíntese')
    expect(prompt.value).toContain('exatamente 10 questões')
    expect(prompt.value).toContain('Sem cálculos')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Quando o armazenamento está cheio, o erro aparece no painel e o texto fica', async () => {
    semearPerfis({ id: 'p1', nome: 'Manhã' })
    renderAt('/provas/nova')
    await preencherConteudo()
    await userEvent.click(botaoManual())
    await colarResposta(respostaColada(10))
    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === 'provario:exams') throw new DOMException('cheio', 'QuotaExceededError')
      return original.call(this, k, v)
    })
    await userEvent.click(within(painelManual()).getByRole('button', { name: 'Montar prova' }))
    expect(screen.getByText(/armazenamento do navegador está cheio/)).toBeInTheDocument()
    expect(within(painelManual()).getByLabelText(/Resposta da IA/)).toHaveValue(respostaColada(10))
  })
})

describe('Prova — visualização', () => {
  it('Dado um id inexistente, mostra aviso com link para Nova prova', () => {
    renderAt('/provas/inexistente')
    expect(screen.getByRole('alert')).toHaveTextContent('Prova não encontrada')
    expect(screen.getByRole('link', { name: 'Gerar uma nova prova' })).toHaveAttribute('href', '/provas/nova')
    expect(screen.getByRole('link', { name: 'Ver provas salvas' })).toHaveAttribute('href', '/provas')
  })

  it('a aba "Provas" fica ativa em /provas/:id', async () => {
    renderAt('/provas/inexistente')
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Provas' })).toHaveAttribute('aria-current', 'page'),
    )
  })
})

describe('Início', () => {
  it('com a chave configurada, o aviso de "tudo pronto" leva a "Gerar uma prova"', () => {
    semearChave()
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Gerar uma prova' })).toHaveAttribute('href', '/provas/nova')
    expect(screen.getByText(/Qual organela celular/)).toBeInTheDocument()
  })
})
