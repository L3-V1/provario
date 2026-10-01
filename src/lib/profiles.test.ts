import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROFILES,
  PROFILES_KEY,
  deleteProfile,
  emptyDraft,
  getProfile,
  getProfiles,
  normalize,
  sortProfiles,
  upsertProfile,
  validateProfile,
  type Profile,
  type ProfileDraft,
  type ProfilesData,
} from './profiles'

function perfil(over: Partial<Profile> = {}): Profile {
  return {
    id: 'id-1',
    nome: 'Perfil A',
    escola: 'Escola A',
    secretaria: '',
    logo: '',
    professora: '',
    anoLetivo: '2026',
    criadoEm: '2026-01-01T10:00:00.000Z',
    atualizadoEm: '2026-01-01T10:00:00.000Z',
    ...over,
  }
}

function rascunho(over: Partial<ProfileDraft> = {}): ProfileDraft {
  return { nome: 'Perfil', escola: 'Escola', secretaria: '', logo: '', professora: '', anoLetivo: '2026', ...over }
}

describe('emptyDraft', () => {
  it('usa o ano atual e professora vazia quando não há perfis', () => {
    const d = emptyDraft([], new Date('2027-03-10T12:00:00'))
    expect(d).toMatchObject({ nome: '', escola: '', secretaria: '', logo: '', professora: '', anoLetivo: '2027' })
    expect(d.id).toBeUndefined()
  })

  it('herda a professora do perfil editado mais recentemente', () => {
    const perfis = [
      perfil({ id: 'a', professora: 'Ana', atualizadoEm: '2026-02-01T00:00:00.000Z' }),
      perfil({ id: 'b', professora: 'Beatriz', atualizadoEm: '2026-05-01T00:00:00.000Z' }),
      perfil({ id: 'c', professora: 'Carla', atualizadoEm: '2026-03-01T00:00:00.000Z' }),
    ]
    expect(emptyDraft(perfis).professora).toBe('Beatriz')
  })
})

describe('validateProfile', () => {
  it('exige nome e escola', () => {
    expect(validateProfile(rascunho({ nome: '', escola: '' }))).toEqual({
      nome: 'Informe o nome do perfil.',
      escola: 'Informe o nome da escola.',
    })
  })

  it('trata só espaços como vazio', () => {
    const erros = validateProfile(rascunho({ nome: '   ', escola: ' \t ' }))
    expect(erros.nome).toBeDefined()
    expect(erros.escola).toBeDefined()
  })

  it('aceita só nome e escola preenchidos (demais campos opcionais)', () => {
    expect(validateProfile(rascunho())).toEqual({})
  })
})

describe('normalize', () => {
  it('apara espaços dos textos e preserva a logo', () => {
    const d = normalize(rascunho({ nome: '  A ', escola: ' B ', secretaria: ' C ', professora: ' D ', anoLetivo: ' 2026 ', logo: 'data:image/png;base64,AA ' }))
    expect(d).toMatchObject({ nome: 'A', escola: 'B', secretaria: 'C', professora: 'D', anoLetivo: '2026' })
    expect(d.logo).toBe('data:image/png;base64,AA ')
  })
})

describe('upsertProfile', () => {
  const vazio: ProfilesData = { version: 1, perfis: [] }

  it('cria com id e datas', () => {
    const r = upsertProfile(vazio, rascunho({ nome: ' Novo ' }), '2026-06-01T00:00:00.000Z')
    expect(r.perfis).toHaveLength(1)
    expect(r.perfis[0].id).toMatch(/\S+/)
    expect(r.perfis[0]).toMatchObject({ nome: 'Novo', criadoEm: '2026-06-01T00:00:00.000Z', atualizadoEm: '2026-06-01T00:00:00.000Z' })
  })

  it('atualiza sem duplicar, preservando criadoEm, e não mexe nos outros', () => {
    const data: ProfilesData = { version: 1, perfis: [perfil({ id: 'a' }), perfil({ id: 'b', nome: 'Outro' })] }
    const r = upsertProfile(data, { ...rascunho({ nome: 'Editado' }), id: 'a' }, '2026-09-01T00:00:00.000Z')
    expect(r.perfis).toHaveLength(2)
    expect(r.perfis[0]).toMatchObject({
      id: 'a',
      nome: 'Editado',
      criadoEm: '2026-01-01T10:00:00.000Z',
      atualizadoEm: '2026-09-01T00:00:00.000Z',
    })
    expect(r.perfis[1]).toEqual(data.perfis[1])
  })

  it('não altera o objeto de entrada', () => {
    const data: ProfilesData = { version: 1, perfis: [] }
    upsertProfile(data, rascunho(), '2026-06-01T00:00:00.000Z')
    expect(data.perfis).toHaveLength(0)
  })
})

describe('deleteProfile', () => {
  it('remove só o perfil indicado', () => {
    const data: ProfilesData = { version: 1, perfis: [perfil({ id: 'a' }), perfil({ id: 'b' })] }
    expect(deleteProfile(data, 'a').perfis.map((p) => p.id)).toEqual(['b'])
  })
})

describe('sortProfiles', () => {
  it('ordena alfabeticamente em pt-BR, ignorando acentos e caixa', () => {
    const perfis = [perfil({ id: '1', nome: 'zélia' }), perfil({ id: '2', nome: 'Álvaro' }), perfil({ id: '3', nome: 'Bento' })]
    expect(sortProfiles(perfis).map((p) => p.nome)).toEqual(['Álvaro', 'Bento', 'zélia'])
  })
})

describe('getProfiles / getProfile', () => {
  it('devolve lista vazia com dado ausente', () => {
    expect(getProfiles()).toEqual([])
  })

  it('devolve lista vazia com dado corrompido', () => {
    localStorage.setItem('provario:' + PROFILES_KEY, '{nao-e-json')
    expect(getProfiles()).toEqual([])
    localStorage.setItem('provario:' + PROFILES_KEY, '{"version":1,"perfis":"x"}')
    expect(getProfiles()).toEqual([])
    localStorage.setItem('provario:' + PROFILES_KEY, 'null')
    expect(getProfiles()).toEqual([])
  })

  it('lê os perfis salvos, em ordem alfabética, e busca por id', () => {
    const data: ProfilesData = { version: 1, perfis: [perfil({ id: 'b', nome: 'Beta' }), perfil({ id: 'a', nome: 'Alfa' })] }
    localStorage.setItem('provario:' + PROFILES_KEY, JSON.stringify(data))
    expect(getProfiles().map((p) => p.nome)).toEqual(['Alfa', 'Beta'])
    expect(getProfile('b')?.nome).toBe('Beta')
    expect(getProfile('zzz')).toBeUndefined()
  })

  it('expõe o padrão vazio da chave', () => {
    expect(DEFAULT_PROFILES).toEqual({ version: 1, perfis: [] })
    expect(PROFILES_KEY).toBe('profiles')
  })
})
