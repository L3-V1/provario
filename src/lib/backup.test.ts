import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BACKUP_VERSION,
  applyBackup,
  backupFileName,
  createBackup,
  downloadJson,
  mergeById,
  parseBackup,
  restoreData,
  type Backup,
} from './backup'
import { EXAMS_KEY, type Exam, type ExamsData } from './exams'
import { PROFILES_KEY, type Profile, type ProfilesData } from './profiles'
import { StorageQuotaError } from './storage'

const AGORA = new Date('2026-10-01T15:00:00.000Z')

function perfil(over: Partial<Profile> = {}): Profile {
  return {
    id: 'p1',
    nome: 'Manhã',
    escola: 'Escola Alfa',
    secretaria: '',
    logo: '',
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

const perfisData = (...perfis: Profile[]): ProfilesData => ({ version: 1, perfis })
const provasData = (...provas: Exam[]): ExamsData => ({ version: 1, provas })

function backup(perfis: Profile[] = [perfil()], provas: Exam[] = [prova()]): Backup {
  return createBackup(perfisData(...perfis), provasData(...provas), AGORA)
}

/** Texto de um backup com um campo alterado, para testar as recusas. */
function texto(alterar: (b: Record<string, any>) => void): string {
  const b = JSON.parse(JSON.stringify(backup()))
  alterar(b)
  return JSON.stringify(b)
}

function recusado(t: string): string {
  const r = parseBackup(t)
  if (r.ok) throw new Error('era para recusar')
  return r.message
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('createBackup / parseBackup', () => {
  it('identifica o app, a versão e a data de exportação', () => {
    const b = backup()
    expect(b.app).toBe('provario')
    expect(b.version).toBe(BACKUP_VERSION)
    expect(b.exportadoEm).toBe(AGORA.toISOString())
  })

  it('ida e volta: o que sai de createBackup entra por parseBackup idêntico', () => {
    const original = backup([perfil(), perfil({ id: 'p2', nome: 'Tarde' })], [prova(), prova({ id: 'e2' })])
    const r = parseBackup(JSON.stringify(original))
    expect(r).toEqual({ ok: true, backup: original })
  })

  it('tolera dado corrompido ou ausente no armazenamento', () => {
    const b = createBackup(null, 'lixo', AGORA)
    expect(b.perfis).toEqual([])
    expect(b.provas).toEqual([])
  })

  it('não inclui a chave do Gemini nem nenhum outro campo além de perfis e provas', () => {
    expect(Object.keys(backup()).sort()).toEqual(['app', 'exportadoEm', 'perfis', 'provas', 'version'])
  })

  it('aceita backup vazio', () => {
    expect(parseBackup(JSON.stringify(backup([], [])))).toMatchObject({ ok: true })
  })
})

describe('parseBackup — recusas', () => {
  it('texto que não é JSON', () => {
    expect(recusado('isto não é json')).toBe('O arquivo não é um JSON válido.')
  })

  it.each([['null'], ['[]'], ['42'], ['"x"']])('JSON %s que não é um objeto', (t) => {
    expect(recusado(t)).toBe('O arquivo não é um backup do Provario.')
  })

  it('app diferente', () => {
    expect(recusado(texto((b) => (b.app = 'outro')))).toBe('O arquivo não é um backup do Provario.')
  })

  it('versão mais nova que a suportada', () => {
    expect(recusado(texto((b) => (b.version = 2)))).toBe(
      'Este backup foi feito por uma versão mais nova do Provario. Atualize o app e tente de novo.',
    )
  })

  it('versão ausente ou inválida', () => {
    expect(recusado(texto((b) => delete b.version))).toBe('O arquivo não é um backup do Provario.')
    expect(recusado(texto((b) => (b.version = 0)))).toBe('O arquivo não é um backup do Provario.')
  })

  it('perfis ou provas que não são listas', () => {
    expect(recusado(texto((b) => (b.perfis = {})))).toBe('O arquivo não é um backup do Provario.')
    expect(recusado(texto((b) => delete b.provas))).toBe('O arquivo não é um backup do Provario.')
  })

  it('perfil inválido, indicando qual', () => {
    expect(recusado(texto((b) => (b.perfis[0].nome = 5)))).toBe('O backup tem um perfil inválido (perfil 1).')
    expect(recusado(texto((b) => delete b.perfis[0].id))).toBe('O backup tem um perfil inválido (perfil 1).')
  })

  it('prova sem questões', () => {
    expect(recusado(texto((b) => (b.provas[0].questoes = [])))).toBe('O backup tem uma prova inválida (prova 1).')
  })

  it('prova com gabarito fora da faixa', () => {
    expect(recusado(texto((b) => (b.provas[0].questoes[0].correta = 4)))).toBe(
      'O backup tem uma prova inválida (prova 1).',
    )
    expect(recusado(texto((b) => (b.provas[0].questoes[0].correta = 0.5)))).toBe(
      'O backup tem uma prova inválida (prova 1).',
    )
  })

  it('prova com alternativas que não são texto', () => {
    expect(recusado(texto((b) => (b.provas[0].questoes[0].alternativas = ['a', 2, 'c', 'd'])))).toBe(
      'O backup tem uma prova inválida (prova 1).',
    )
  })

  it('prova com alternativas repetidas ou enunciado vazio (reusa validateQuestions)', () => {
    expect(recusado(texto((b) => (b.provas[0].questoes[0].alternativas = ['a', 'a', 'c', 'd'])))).toContain('prova 1')
    expect(recusado(texto((b) => (b.provas[0].questoes[0].enunciado = '  ')))).toContain('prova 1')
  })

  it('prova com série ou dificuldade inválidas', () => {
    expect(recusado(texto((b) => (b.provas[0].params.serie = '1º ano')))).toContain('prova 1')
    expect(recusado(texto((b) => (b.provas[0].params.dificuldade = 'extrema')))).toContain('prova 1')
  })

  it('prova sem params ou sem snapshot de perfil', () => {
    expect(recusado(texto((b) => delete b.provas[0].params))).toContain('prova 1')
    expect(recusado(texto((b) => delete b.provas[0].perfil))).toContain('prova 1')
  })

  it('aponta a posição da prova inválida', () => {
    const b = backup([perfil()], [prova(), prova({ id: 'e2' }), prova({ id: 'e3' })])
    b.provas[2].questoes = []
    expect(recusado(JSON.stringify(b))).toBe('O backup tem uma prova inválida (prova 3).')
  })

  it('ids de perfil repetidos', () => {
    const b = backup([perfil(), perfil()])
    expect(recusado(JSON.stringify(b))).toBe('O backup tem perfis com o mesmo id.')
  })

  it('ids de prova repetidos', () => {
    const b = backup([perfil()], [prova(), prova()])
    expect(recusado(JSON.stringify(b))).toBe('O backup tem provas com o mesmo id.')
  })

  it('recusa o arquivo inteiro se um único item é inválido', () => {
    const b = backup([perfil()], [prova(), prova({ id: 'e2', questoes: [] })])
    expect(parseBackup(JSON.stringify(b)).ok).toBe(false)
  })
})

describe('backupFileName', () => {
  it('usa a data local no formato AAAA-MM-DD', () => {
    expect(backupFileName(new Date(2026, 9, 1, 23, 59))).toBe('provario-backup-2026-10-01.json')
    expect(backupFileName(new Date(2026, 0, 5, 0, 1))).toBe('provario-backup-2026-01-05.json')
  })
})

describe('mergeById', () => {
  const item = (id: string, atualizadoEm: string, nome = id) => ({ id, atualizadoEm, nome })

  it('mantém os atuais e acrescenta os novos', () => {
    const r = mergeById([item('a', '2026-01-01')], [item('b', '2026-01-01')])
    expect(r.itens.map((i) => i.id)).toEqual(['a', 'b'])
    expect(r).toMatchObject({ novos: 1, atualizados: 0 })
  })

  it('em conflito, fica o de atualizadoEm maior (importado mais novo)', () => {
    const r = mergeById([item('a', '2026-01-01', 'velho')], [item('a', '2026-02-01', 'novo')])
    expect(r.itens).toEqual([item('a', '2026-02-01', 'novo')])
    expect(r).toMatchObject({ novos: 0, atualizados: 1 })
  })

  it('em conflito, fica o atual se for o mais novo', () => {
    const r = mergeById([item('a', '2026-03-01', 'atual')], [item('a', '2026-02-01', 'importado')])
    expect(r.itens[0].nome).toBe('atual')
    expect(r).toMatchObject({ novos: 0, atualizados: 0 })
  })

  it('no empate, fica o atual', () => {
    const r = mergeById([item('a', '2026-01-01', 'atual')], [item('a', '2026-01-01', 'importado')])
    expect(r.itens[0].nome).toBe('atual')
    expect(r.atualizados).toBe(0)
  })

  it('preserva a posição do item atual substituído', () => {
    const r = mergeById(
      [item('a', '2026-01-01'), item('b', '2026-01-01')],
      [item('a', '2026-02-01', 'novo'), item('c', '2026-01-01')],
    )
    expect(r.itens.map((i) => i.id)).toEqual(['a', 'b', 'c'])
    expect(r.itens[0].nome).toBe('novo')
  })
})

describe('applyBackup', () => {
  const atualPerfis = perfisData(perfil({ id: 'x', nome: 'Atual' }))
  const atualProvas = provasData(prova({ id: 'ex' }))
  const doBackup = backup([perfil({ id: 'p1' })], [prova({ id: 'e1' })])

  it('substituir: só o conteúdo do backup fica', () => {
    const r = applyBackup('substituir', { perfis: atualPerfis, provas: atualProvas }, doBackup)
    expect(r.dados.perfis.perfis.map((p) => p.id)).toEqual(['p1'])
    expect(r.dados.provas.provas.map((p) => p.id)).toEqual(['e1'])
    expect(r.dados.perfis.version).toBe(1)
  })

  it('mesclar: junta atuais e importados e conta novos e atualizados', () => {
    const r = applyBackup('mesclar', { perfis: atualPerfis, provas: atualProvas }, doBackup)
    expect(r.dados.perfis.perfis.map((p) => p.id)).toEqual(['x', 'p1'])
    expect(r.dados.provas.provas.map((p) => p.id)).toEqual(['ex', 'e1'])
    expect(r.resumo).toEqual({ perfis: { novos: 1, atualizados: 0 }, provas: { novos: 1, atualizados: 0 } })
  })

  it('mesclar com conflito escolhe pelo atualizadoEm', () => {
    const atual = { perfis: perfisData(), provas: provasData(prova({ id: 'e1', titulo: 'Velha' })) }
    const b = backup([], [prova({ id: 'e1', titulo: 'Nova', atualizadoEm: '2026-09-01T00:00:00.000Z' })])
    const r = applyBackup('mesclar', atual, b)
    expect(r.dados.provas.provas[0].titulo).toBe('Nova')
    expect(r.resumo.provas).toEqual({ novos: 0, atualizados: 1 })
  })

  it('substituir informa as contagens do que entrou', () => {
    const r = applyBackup('substituir', { perfis: atualPerfis, provas: atualProvas }, doBackup)
    expect(r.resumo).toEqual({ perfis: { novos: 1, atualizados: 0 }, provas: { novos: 1, atualizados: 0 } })
  })

  it('tolera dados atuais ausentes ou corrompidos', () => {
    const r = applyBackup('mesclar', { perfis: null, provas: 'lixo' }, doBackup)
    expect(r.dados.perfis.perfis).toHaveLength(1)
    expect(r.dados.provas.provas).toHaveLength(1)
  })
})

describe('restoreData', () => {
  const antigosPerfis = perfisData(perfil({ id: 'antigo' }))
  const novosPerfis = perfisData(perfil({ id: 'novo' }))
  const novasProvas = provasData(prova({ id: 'e-novo' }))

  const lerPerfis = () => JSON.parse(localStorage.getItem(`provario:${PROFILES_KEY}`)!)

  it('grava perfis e provas', () => {
    restoreData({ perfis: novosPerfis, provas: novasProvas })
    expect(lerPerfis()).toEqual(novosPerfis)
    expect(JSON.parse(localStorage.getItem(`provario:${EXAMS_KEY}`)!)).toEqual(novasProvas)
  })

  it('se a escrita das provas estoura a cota, devolve os perfis anteriores e relança o erro', () => {
    localStorage.setItem(`provario:${PROFILES_KEY}`, JSON.stringify(antigosPerfis))
    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === `provario:${EXAMS_KEY}`) throw new DOMException('cheio', 'QuotaExceededError')
      return original.call(this, k, v)
    })

    expect(() => restoreData({ perfis: novosPerfis, provas: novasProvas })).toThrow(StorageQuotaError)
    expect(lerPerfis()).toEqual(antigosPerfis)
    expect(localStorage.getItem(`provario:${EXAMS_KEY}`)).toBeNull()
  })

  it('se não havia perfis antes, a reversão remove a chave', () => {
    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === `provario:${EXAMS_KEY}`) throw new DOMException('cheio', 'QuotaExceededError')
      return original.call(this, k, v)
    })
    expect(() => restoreData({ perfis: novosPerfis, provas: novasProvas })).toThrow(StorageQuotaError)
    expect(localStorage.getItem(`provario:${PROFILES_KEY}`)).toBeNull()
  })

  it('se a escrita dos perfis estoura a cota, nada é alterado e o erro sobe', () => {
    localStorage.setItem(`provario:${PROFILES_KEY}`, JSON.stringify(antigosPerfis))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError')
    })
    expect(() => restoreData({ perfis: novosPerfis, provas: novasProvas })).toThrow(StorageQuotaError)
    expect(lerPerfis()).toEqual(antigosPerfis)
  })
})

describe('downloadJson', () => {
  it('cria um Blob JSON sem indentação, clica num <a download> e libera a URL', async () => {
    const criar = vi.fn(() => 'blob:fake')
    const revogar = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: criar, revokeObjectURL: revogar })
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('x.json')
      expect(this.href).toBe('blob:fake')
    })

    downloadJson('x.json', { a: 1 })

    expect(clique).toHaveBeenCalledOnce()
    expect(revogar).toHaveBeenCalledWith('blob:fake')
    const blob = (criar.mock.calls[0] as unknown as [Blob])[0]
    expect(blob.type).toBe('application/json')
    expect(await blob.text()).toBe('{"a":1}')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
