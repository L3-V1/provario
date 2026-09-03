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

/** Trecho de texto com formatação inline resolvida pelo parser. */
export type SegmentoTexto = {
    texto: string;
    negrito?: boolean;
    italico?: boolean;
};

/** Enunciado / texto de alternativa / afirmação, já segmentado. */
export type TextoFormatado = SegmentoTexto[];

export type LetraAlternativa = 'a' | 'b' | 'c' | 'd' | 'e';

export type Alternativa = {
    letra: LetraAlternativa;
    texto: TextoFormatado;
};

export type QuestaoMultiplaEscolha = {
    numero: number;
    tipo: 'multipla-escolha';
    enunciado: TextoFormatado;
    alternativas: Alternativa[];
    /** Letra correta do gabarito, ou null se ausente/irreconhecível. */
    gabarito: LetraAlternativa | null;
};

export type AfirmacaoVF = {
    numero: number; // numeração local (1, 2, 3...) dentro da questão
    texto: TextoFormatado;
    gabarito: 'V' | 'F' | null;
};

export type QuestaoVerdadeiroFalso = {
    numero: number;
    tipo: 'verdadeiro-falso';
    enunciado: TextoFormatado;
    afirmacoes: AfirmacaoVF[];
};

export type Questao = QuestaoMultiplaEscolha | QuestaoVerdadeiroFalso;

export type AvisoParsing = {
    codigo: string;
    mensagem: string;
    questao?: number; // número da questão referida, quando aplicável
};

export type ProvaParseada = {
    questoes: Questao[];
    avisos: AvisoParsing[];
};

export type OpcoesParse = {
    /** Quantidade pedida no Passo 1; habilita o aviso QUANTIDADE_DIVERGENTE. */
    quantidadeEsperada?: number | null;
};

export type RascunhoProva = {
    versao: 1;
    passoAtual: number;
    config: ConfigProva;
    conteudo: { markdown: string };
    cabecalho: CabecalhoProva;
    layout: LayoutColunas;
};
