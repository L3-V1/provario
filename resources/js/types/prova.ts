export type PerfilResumo = {
    id: number;
    instituicao: string;
    escola: string;
    professor: string;
    logo_url: string | null;
};

export const MATERIAS = [
    'Português',
    'Matemática',
    'Ciências',
    'História',
    'Geografia',
    'Arte',
    'Inglês',
    'Educação Física',
    'Ensino Religioso',
] as const;

export type Materia = (typeof MATERIAS)[number];

/** Anos do ensino fundamental (1º ao 9º). */
export const ANOS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type LayoutColunas = 1 | 2;

export type ConfigProva = {
    materia: Materia | null;
    ano: number | null;
    conteudo: string;
    quantidade: number | null;
};

export type CabecalhoProva = {
    perfil_id: number | null;
    logo_url: string | null;
    instituicao: string;
    escola: string;
    disciplina: string;
    professor: string;
    titulo: string;
    bimestre: string;
    valor_total: string;
};

export type RascunhoProva = {
    versao: 1;
    passoAtual: number;
    config: ConfigProva;
    conteudo: { markdown: string };
    cabecalho: CabecalhoProva;
    layout: LayoutColunas;
};
