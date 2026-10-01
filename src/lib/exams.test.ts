import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EXAMS,
  addExam,
  defaultTitle,
  initialParams,
  letraAlternativa,
  linhaIdentificacao,
  listExams,
  normalizeParams,
  normalizeQuestions,
  questionsEqual,
  removeQuestion,
  rememberedParams,
  replaceQuestion,
  setCorreta,
  updateExam,
  validateQuestions,
  withQuestions,
  rotuloDificuldade,
  validateParams,
  type Exam,
  type ExamParams,
  type Question,
} from './exams'
import type { Profile } from './profiles'

function perfil(over: Partial<Profile>): Profile {
  return {
    id: 'p1',
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

function params(over: Partial<ExamParams> = {}): ExamParams {
  return {
    perfilId: 'p1',
    disciplina: 'Ciências',
    serie: '7º ano',
    turmas: '7º A',
    conteudo: 'Células',
    quantidade: 10,
    alternativas: 4,
    dificuldade: 'media',
    titulo: '',
    observacoes: '',
    ...over,
  }
}

describe('initialParams', () => {
  const perfis = [perfil({ id: 'b', nome: 'Beta' }), perfil({ id: 'a', nome: 'Alfa' })]

  it('sem lembrados: Ciências, 10 questões, 4 alternativas, média e primeiro perfil em ordem alfabética', () => {
    expect(initialParams(perfis, undefined)).toMatchObject({
      perfilId: 'a',
      disciplina: 'Ciências',
      quantidade: 10,
      alternativas: 4,
      dificuldade: 'media',
      conteudo: '',
      titulo: '',
      observacoes: '',
    })
  })

  it('usa os parâmetros lembrados, com conteúdo, título e observações vazios', () => {
    const r = initialParams(perfis, {
      perfilId: 'b',
      disciplina: 'Biologia',
      serie: '9º ano',
      turmas: '9º B',
      quantidade: 5,
      alternativas: 5,
      dificuldade: 'dificil',
    })
    expect(r).toMatchObject({
      perfilId: 'b',
      disciplina: 'Biologia',
      serie: '9º ano',
      turmas: '9º B',
      quantidade: 5,
      alternativas: 5,
      dificuldade: 'dificil',
      conteudo: '',
      titulo: '',
      observacoes: '',
    })
  })

  it('cai no primeiro perfil quando o lembrado foi excluído', () => {
    expect(initialParams(perfis, { perfilId: 'excluido' }).perfilId).toBe('a')
  })

  it('sem perfis, perfilId fica vazio', () => {
    expect(initialParams([], undefined).perfilId).toBe('')
  })

  it('ignora valores lembrados inválidos', () => {
    const r = initialParams(perfis, { quantidade: 'x', alternativas: 7, dificuldade: 'xyz', serie: '1º ano' } as never)
    expect(r).toMatchObject({ quantidade: 10, alternativas: 4, dificuldade: 'media', serie: '7º ano' })
  })
})

describe('rememberedParams', () => {
  it('guarda só os campos combinados', () => {
    const r = rememberedParams(params({ conteudo: 'segredo', titulo: 't', observacoes: 'o' }))
    expect(r).toEqual({
      perfilId: 'p1',
      disciplina: 'Ciências',
      serie: '7º ano',
      turmas: '7º A',
      quantidade: 10,
      alternativas: 4,
      dificuldade: 'media',
    })
  })
})

describe('validateParams', () => {
  const perfis = [perfil({ id: 'p1' })]

  it('parâmetros válidos não geram erros', () => {
    expect(validateParams(params(), perfis)).toEqual({})
  })

  it('perfil obrigatório e existente', () => {
    expect(validateParams(params({ perfilId: '' }), perfis).perfilId).toBe('Escolha um perfil.')
    expect(validateParams(params({ perfilId: 'zzz' }), perfis).perfilId).toBe('Escolha um perfil.')
  })

  it('conteúdo obrigatório', () => {
    expect(validateParams(params({ conteudo: '   ' }), perfis).conteudo).toBe(
      'Descreva o conteúdo que a prova deve cobrir.',
    )
  })

  it('disciplina não vazia', () => {
    expect(validateParams(params({ disciplina: ' ' }), perfis).disciplina).toBe('Informe a disciplina.')
  })

  it.each([0, 21, 2.5, Number.NaN, -1])('quantidade %s é rejeitada', (q) => {
    expect(validateParams(params({ quantidade: q }), perfis).quantidade).toBe(
      'Informe um número inteiro de 1 a 20.',
    )
  })

  it.each([1, 20])('quantidade %s é aceita', (q) => {
    expect(validateParams(params({ quantidade: q }), perfis).quantidade).toBeUndefined()
  })
})

describe('título', () => {
  it('padrão: Avaliação de {disciplina} — {série}', () => {
    expect(defaultTitle(params())).toBe('Avaliação de Ciências — 7º ano')
  })

  it('normalizeParams apara espaços (título vazio continua vazio)', () => {
    const r = normalizeParams(params({ disciplina: ' Ciências ', conteudo: ' x ', titulo: '  ', turmas: ' 7º A ' }))
    expect(r.disciplina).toBe('Ciências')
    expect(r.conteudo).toBe('x')
    expect(r.turmas).toBe('7º A')
    expect(r.titulo).toBe('')
  })

  it('título informado é mantido (aparado)', () => {
    expect(normalizeParams(params({ titulo: ' Prova 1 ' })).titulo).toBe('Prova 1')
  })
})

describe('listExams / addExam', () => {
  const exam = { id: 'e1', titulo: 'T' } as Exam

  it('tolera dado ausente ou corrompido', () => {
    expect(listExams(null)).toEqual([])
    expect(listExams(undefined)).toEqual([])
    expect(listExams('lixo')).toEqual([])
    expect(listExams({ provas: 'x' })).toEqual([])
    expect(listExams({ version: 1, provas: [exam] })).toEqual([exam])
  })

  it('addExam acrescenta sem alterar os existentes', () => {
    const r = addExam(DEFAULT_EXAMS, exam)
    expect(r).toEqual({ version: 1, provas: [exam] })
    const r2 = addExam(r, { ...exam, id: 'e2' })
    expect(r2.provas.map((p) => p.id)).toEqual(['e1', 'e2'])
    expect(DEFAULT_EXAMS.provas).toEqual([])
  })

  it('addExam sobre dado corrompido recomeça a lista', () => {
    expect(addExam(null as never, exam).provas).toEqual([exam])
  })
})

describe('letraAlternativa', () => {
  it('devolve a–e para os índices 0 a 4', () => {
    expect([0, 1, 2, 3, 4].map(letraAlternativa)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('rotuloDificuldade', () => {
  it('devolve o rótulo de cada dificuldade', () => {
    expect(rotuloDificuldade('facil')).toBe('Fácil')
    expect(rotuloDificuldade('media')).toBe('Média')
    expect(rotuloDificuldade('dificil')).toBe('Difícil')
    expect(rotuloDificuldade('mista')).toBe('Mista')
  })
})

describe('linhaIdentificacao', () => {
  function prova(perfilOver: Partial<Profile>, paramsOver: Partial<ExamParams> = {}): Exam {
    const { criadoEm: _c, atualizadoEm: _a, ...snapshot } = perfil(perfilOver)
    return {
      id: 'e1',
      titulo: 'Prova',
      params: params(paramsOver),
      perfil: snapshot,
      questoes: [],
      modelo: 'm',
      criadoEm: '2026-01-01T10:00:00.000Z',
      atualizadoEm: '2026-01-01T10:00:00.000Z',
    }
  }

  it('monta professora, disciplina, série e ano letivo, nessa ordem', () => {
    expect(linhaIdentificacao(prova({ professora: 'Ana' }))).toEqual([
      'Professora: Ana',
      'Ciências',
      '7º ano',
      '2026',
    ])
  })

  it('omite professora e ano letivo vazios', () => {
    expect(linhaIdentificacao(prova({ professora: '  ', anoLetivo: '' }))).toEqual(['Ciências', '7º ano'])
  })
})

const questao = (over: Partial<Question> = {}): Question => ({
  enunciado: 'Qual organela faz a respiração?',
  alternativas: ['Ribossomo', 'Mitocôndria', 'Golgi', 'Lisossomo'],
  correta: 1,
  ...over,
})

function provaMinima(id: string, titulo = 'T'): Exam {
  return { id, titulo, questoes: [questao()] } as unknown as Exam
}

describe('updateExam', () => {
  it('troca só a prova de mesmo id, mantendo as outras e a ordem', () => {
    const data = { version: 1 as const, provas: [provaMinima('a'), provaMinima('b'), provaMinima('c')] }
    const r = updateExam(data, provaMinima('b', 'Novo'))
    expect(r.provas.map((p) => [p.id, p.titulo])).toEqual([['a', 'T'], ['b', 'Novo'], ['c', 'T']])
  })

  it('id inexistente não altera a lista', () => {
    const data = { version: 1 as const, provas: [provaMinima('a')] }
    expect(updateExam(data, provaMinima('x')).provas).toEqual(data.provas)
  })

  it('tolera dado corrompido ou ausente', () => {
    expect(updateExam(null as never, provaMinima('a'))).toEqual({ version: 1, provas: [] })
    expect(updateExam({ version: 1, provas: 'lixo' } as never, provaMinima('a')).provas).toEqual([])
  })
})

describe('validateQuestions', () => {
  it('questão válida não gera erro', () => {
    expect(validateQuestions([questao(), questao()])).toEqual({})
  })

  it('enunciado vazio ou só com espaços', () => {
    const r = validateQuestions([questao(), questao({ enunciado: '   ' })])
    expect(r[1]?.enunciado).toBe('Escreva o enunciado.')
    expect(r[0]).toBeUndefined()
  })

  it('alternativa vazia é apontada pelo índice', () => {
    const r = validateQuestions([questao({ alternativas: ['A', ' ', 'C', 'D'] })])
    expect(r[0]?.alternativas?.[1]).toBe('Preencha esta alternativa.')
    expect(r[0]?.alternativas?.[0]).toBeUndefined()
  })

  it('alternativas repetidas, ignorando caixa e espaços', () => {
    const r = validateQuestions([questao({ alternativas: ['Golgi', 'golgi ', 'C', 'D'] })])
    expect(r[0]?.repetidas).toBe('Há alternativas repetidas.')
  })

  it('gabarito fora do intervalo', () => {
    expect(validateQuestions([questao({ correta: 4 })])[0]?.correta).toBe('Marque a alternativa correta.')
    expect(validateQuestions([questao({ correta: -1 })])[0]?.correta).toBe('Marque a alternativa correta.')
  })
})

describe('normalizeQuestions', () => {
  it('faz trim no enunciado e nas alternativas', () => {
    const [q] = normalizeQuestions([questao({ enunciado: '  Oi  ', alternativas: [' a ', 'b ', ' c', 'd'] })])
    expect(q.enunciado).toBe('Oi')
    expect(q.alternativas).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('removeQuestion / replaceQuestion / setCorreta', () => {
  const tres = [questao({ enunciado: 'Q1' }), questao({ enunciado: 'Q2' }), questao({ enunciado: 'Q3' })]

  it('remove e as demais ficam na ordem (a numeração é a posição)', () => {
    expect(removeQuestion(tres, 1).map((q) => q.enunciado)).toEqual(['Q1', 'Q3'])
    expect(tres).toHaveLength(3)
  })

  it('recusa remover a última questão', () => {
    const uma = [questao()]
    expect(removeQuestion(uma, 0)).toBe(uma)
  })

  it('replaceQuestion troca só a posição indicada, sem mutar', () => {
    const r = replaceQuestion(tres, 2, questao({ enunciado: 'Nova' }))
    expect(r.map((q) => q.enunciado)).toEqual(['Q1', 'Q2', 'Nova'])
    expect(tres[2].enunciado).toBe('Q3')
  })

  it('setCorreta muda só o gabarito daquela questão', () => {
    const r = setCorreta(tres, 0, 3)
    expect(r[0].correta).toBe(3)
    expect(r[1].correta).toBe(1)
    expect(tres[0].correta).toBe(1)
  })
})

describe('questionsEqual', () => {
  it('iguais por valor', () => {
    expect(questionsEqual([questao()], [questao()])).toBe(true)
  })

  it('detecta mudança de texto, de gabarito e de quantidade', () => {
    expect(questionsEqual([questao()], [questao({ enunciado: 'x' })])).toBe(false)
    expect(questionsEqual([questao()], [questao({ alternativas: ['a', 'b', 'c', 'd'] })])).toBe(false)
    expect(questionsEqual([questao()], [questao({ correta: 0 })])).toBe(false)
    expect(questionsEqual([questao()], [questao(), questao()])).toBe(false)
  })
})

describe('withQuestions', () => {
  it('troca as questões e renova atualizadoEm, sem mexer em criadoEm', () => {
    const original = { ...provaMinima('a'), criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-01T00:00:00.000Z' }
    const nova = withQuestions(original, [questao({ enunciado: 'Novo' })])
    expect(nova.questoes[0].enunciado).toBe('Novo')
    expect(nova.criadoEm).toBe(original.criadoEm)
    expect(nova.atualizadoEm).not.toBe(original.atualizadoEm)
    expect(original.questoes[0].enunciado).not.toBe('Novo')
  })
})
