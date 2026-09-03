import type {
    Alternativa,
    AvisoParsing,
    LetraAlternativa,
    OpcoesParse,
    ProvaParseada,
    Questao,
    QuestaoMultiplaEscolha,
    QuestaoVerdadeiroFalso,
    SegmentoTexto,
    TextoFormatado,
} from '@/types/prova';

/**
 * Resolve a formatação inline suportada (`**negrito**`, `*itálico*`,
 * `***ambos***`) num texto de uma linha lógica já unida, devolvendo um array
 * de segmentos. Qualquer outro marcador markdown entra como texto puro.
 * Sempre retorna ao menos um segmento (`[{ texto: '' }]` para entrada vazia).
 */
export function segmentar(texto: string): TextoFormatado {
    const segmentos: SegmentoTexto[] = [];
    let buffer = '';
    let i = 0;

    const empurrar = (
        conteudo: string,
        formato: { negrito?: boolean; italico?: boolean } = {},
    ): void => {
        if (!conteudo) {
            return;
        }
        const segmento: SegmentoTexto = { texto: conteudo };
        if (formato.negrito) {
            segmento.negrito = true;
        }
        if (formato.italico) {
            segmento.italico = true;
        }
        segmentos.push(segmento);
    };

    while (i < texto.length) {
        if (texto[i] !== '*') {
            buffer += texto[i];
            i += 1;
            continue;
        }

        let tamanho = 1;
        while (tamanho < 3 && texto[i + tamanho] === '*') {
            tamanho += 1;
        }
        const marcador = '*'.repeat(tamanho);
        const inicioConteudo = i + tamanho;
        const fim = texto.indexOf(marcador, inicioConteudo);
        const conteudo = fim === -1 ? '' : texto.slice(inicioConteudo, fim);

        if (
            fim !== -1 &&
            conteudo.length > 0 &&
            !/^\s/.test(conteudo) &&
            !/\s$/.test(conteudo)
        ) {
            empurrar(buffer);
            buffer = '';
            empurrar(conteudo, {
                negrito: tamanho >= 2,
                italico: tamanho === 1 || tamanho === 3,
            });
            i = fim + tamanho;
            continue;
        }

        buffer += marcador;
        i += tamanho;
    }

    empurrar(buffer);

    if (segmentos.length === 0) {
        segmentos.push({ texto: '' });
    }

    return segmentos;
}

const LETRAS: readonly LetraAlternativa[] = ['a', 'b', 'c', 'd', 'e'];
const RE_ALTERNATIVA = /^([a-e])\)\s+(.+)$/;
const RE_AFIRMACAO = /^(\d+)\.\s*\(\s*\)\s+(.+)$/;

const semAcento = (valor: string): string =>
    valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

type ParamsAviso = {
    n?: number;
    titulo?: string;
    linha?: string;
    tipo?: string;
    esperado?: number;
    encontrado?: number;
};

function mensagemAviso(codigo: string, p: ParamsAviso): string {
    switch (codigo) {
        case 'SEM_QUESTOES':
            return 'Nenhuma questão reconhecida no markdown colado.';
        case 'CONTEUDO_IGNORADO_ANTES':
            return 'Há texto antes da primeira questão; ele foi ignorado.';
        case 'SECAO_DESCONHECIDA':
            return `Seção "${p.titulo ?? ''}" não é reconhecida e foi ignorada.`;
        case 'CABECALHO_QUESTAO_MALFORMADO':
            return `Cabeçalho de questão mal formado: "${p.linha ?? ''}".`;
        case 'TIPO_QUESTAO_DESCONHECIDO':
            return `Questão ${p.n}: tipo "${p.tipo ?? ''}" não é suportado (use múltipla escolha ou verdadeiro ou falso).`;
        case 'NUMERACAO_INESPERADA':
            return 'Numeração das questões fora da sequência esperada (1, 2, 3...).';
        case 'MULTIPLA_ESCOLHA_SEM_ALTERNATIVAS':
            return `Questão ${p.n}: nenhuma alternativa (a–e) encontrada.`;
        case 'ALTERNATIVAS_INSUFICIENTES':
            return `Questão ${p.n}: menos de 2 alternativas.`;
        case 'ALTERNATIVA_FORA_DE_ORDEM':
            return `Questão ${p.n}: alternativas fora de ordem ou repetidas.`;
        case 'VF_SEM_AFIRMACOES':
            return `Questão ${p.n}: nenhuma afirmação no formato "N. ( ) texto".`;
        case 'GABARITO_AUSENTE':
            return 'Seção "## Gabarito" não encontrada.';
        case 'GABARITO_INCOMPLETO':
            return `Questão ${p.n}: sem resposta no gabarito.`;
        case 'GABARITO_NAO_RECONHECIDO':
            return `Questão ${p.n}: resposta do gabarito não reconhecida.`;
        case 'GABARITO_VF_DIVERGENTE':
            return `Questão ${p.n}: as respostas do gabarito não batem com as afirmações.`;
        case 'GABARITO_SOBRANDO':
            return `Gabarito traz a resposta ${p.n}, mas não existe questão ${p.n}.`;
        case 'QUANTIDADE_DIVERGENTE':
            return `Foram pedidas ${p.esperado} questões, mas o markdown tem ${p.encontrado}.`;
        default:
            return codigo;
    }
}

/** Une as linhas de um enunciado num único texto, colapsando espaços. */
function juntarEnunciado(linhas: string[]): string {
    return linhas
        .map((linha) => linha.trim())
        .filter((linha) => linha.length > 0)
        .join(' ');
}

function parseMultiplaEscolha(
    numero: number,
    linhas: string[],
    avisos: AvisoParsing[],
): QuestaoMultiplaEscolha {
    const primeiraAlt = linhas.findIndex((linha) => RE_ALTERNATIVA.test(linha));
    const corte = primeiraAlt === -1 ? linhas.length : primeiraAlt;
    const enunciado = segmentar(juntarEnunciado(linhas.slice(0, corte)));

    const alternativas: Alternativa[] = [];
    for (const linha of linhas.slice(corte)) {
        const m = linha.match(RE_ALTERNATIVA);
        if (m) {
            alternativas.push({
                letra: m[1] as LetraAlternativa,
                texto: segmentar(m[2].trim()),
            });
        }
    }

    const sequenciaEsperada = LETRAS.slice(0, alternativas.length).join('');
    const sequenciaLida = alternativas.map((a) => a.letra).join('');
    if (alternativas.length > 0 && sequenciaLida !== sequenciaEsperada) {
        avisos.push({
            codigo: 'ALTERNATIVA_FORA_DE_ORDEM',
            mensagem: mensagemAviso('ALTERNATIVA_FORA_DE_ORDEM', { n: numero }),
            questao: numero,
        });
    }

    if (alternativas.length === 0) {
        avisos.push({
            codigo: 'MULTIPLA_ESCOLHA_SEM_ALTERNATIVAS',
            mensagem: mensagemAviso('MULTIPLA_ESCOLHA_SEM_ALTERNATIVAS', {
                n: numero,
            }),
            questao: numero,
        });
    } else if (alternativas.length < 2) {
        avisos.push({
            codigo: 'ALTERNATIVAS_INSUFICIENTES',
            mensagem: mensagemAviso('ALTERNATIVAS_INSUFICIENTES', {
                n: numero,
            }),
            questao: numero,
        });
    }

    return {
        numero,
        tipo: 'multipla-escolha',
        enunciado,
        alternativas,
        gabarito: null,
    };
}

function parseVerdadeiroFalso(
    numero: number,
    linhas: string[],
    avisos: AvisoParsing[],
): QuestaoVerdadeiroFalso {
    const primeira = linhas.findIndex((linha) => RE_AFIRMACAO.test(linha));
    const corte = primeira === -1 ? linhas.length : primeira;
    const enunciado = segmentar(juntarEnunciado(linhas.slice(0, corte)));

    const afirmacoes = linhas
        .slice(corte)
        .map((linha) => linha.match(RE_AFIRMACAO))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => ({
            numero: Number.parseInt(m[1], 10),
            texto: segmentar(m[2].trim()),
            gabarito: null,
        }));

    if (afirmacoes.length === 0) {
        avisos.push({
            codigo: 'VF_SEM_AFIRMACOES',
            mensagem: mensagemAviso('VF_SEM_AFIRMACOES', { n: numero }),
            questao: numero,
        });
    }

    return { numero, tipo: 'verdadeiro-falso', enunciado, afirmacoes };
}

const RE_LINHA_GABARITO = /^(\d+)\.\s*(.+)$/;
const RE_PAR_VF = /(\d+)\s*[-:=\s]\s*([vVfF])/g;

function aplicarGabarito(
    questoes: Questao[],
    linhas: string[],
    avisos: AvisoParsing[],
): void {
    const porNumero = new Map<number, Questao>();
    questoes.forEach((questao) => porNumero.set(questao.numero, questao));
    const respondidas = new Set<number>();

    for (const linha of linhas) {
        const m = linha.trim().match(RE_LINHA_GABARITO);
        if (!m) {
            continue;
        }
        const numero = Number.parseInt(m[1], 10);
        const resposta = m[2].trim();
        const questao = porNumero.get(numero);

        if (!questao) {
            avisos.push({
                codigo: 'GABARITO_SOBRANDO',
                mensagem: mensagemAviso('GABARITO_SOBRANDO', { n: numero }),
                questao: numero,
            });
            continue;
        }

        respondidas.add(numero);

        if (questao.tipo === 'multipla-escolha') {
            const letra = resposta.slice(0, 1).toLowerCase();
            if ((LETRAS as readonly string[]).includes(letra)) {
                questao.gabarito = letra as LetraAlternativa;
            } else {
                avisos.push({
                    codigo: 'GABARITO_NAO_RECONHECIDO',
                    mensagem: mensagemAviso('GABARITO_NAO_RECONHECIDO', {
                        n: numero,
                    }),
                    questao: numero,
                });
            }
            continue;
        }

        const pares = [...resposta.matchAll(RE_PAR_VF)];
        if (pares.length === 0) {
            avisos.push({
                codigo: 'GABARITO_NAO_RECONHECIDO',
                mensagem: mensagemAviso('GABARITO_NAO_RECONHECIDO', {
                    n: numero,
                }),
                questao: numero,
            });
            continue;
        }

        const numerosComPar = new Set<number>();
        let divergente = false;
        for (const par of pares) {
            const local = Number.parseInt(par[1], 10);
            numerosComPar.add(local);
            const afirmacao = questao.afirmacoes.find(
                (a) => a.numero === local,
            );
            if (afirmacao) {
                afirmacao.gabarito = par[2].toUpperCase() as 'V' | 'F';
            } else {
                divergente = true;
            }
        }
        if (questao.afirmacoes.some((a) => !numerosComPar.has(a.numero))) {
            divergente = true;
        }
        if (divergente) {
            avisos.push({
                codigo: 'GABARITO_VF_DIVERGENTE',
                mensagem: mensagemAviso('GABARITO_VF_DIVERGENTE', {
                    n: numero,
                }),
                questao: numero,
            });
        }
    }

    for (const questao of questoes) {
        if (!respondidas.has(questao.numero)) {
            avisos.push({
                codigo: 'GABARITO_INCOMPLETO',
                mensagem: mensagemAviso('GABARITO_INCOMPLETO', {
                    n: questao.numero,
                }),
                questao: questao.numero,
            });
        }
    }
}

/**
 * Interpreta o markdown de uma prova no contrato do Passo 2. Função pura e
 * determinística — nunca lança: qualquer desvio do contrato vira `AvisoParsing`
 * e o parser segue com o que conseguiu montar.
 */
export function parseProva(
    markdown: string,
    opcoes?: OpcoesParse,
): ProvaParseada {
    const avisos: AvisoParsing[] = [];
    const questoes: Questao[] = [];

    const linhas = markdown
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((linha) => linha.replace(/\s+$/, ''));

    const indicesCabecalho = linhas
        .map((linha, indice) => (linha.startsWith('## ') ? indice : -1))
        .filter((indice) => indice !== -1);

    let houveCabecalhoQuestao = false;
    let linhasGabarito: string[] | null = null;

    if (indicesCabecalho.length > 0) {
        const preambulo = linhas.slice(0, indicesCabecalho[0]);
        if (preambulo.some((linha) => linha.trim().length > 0)) {
            avisos.push({
                codigo: 'CONTEUDO_IGNORADO_ANTES',
                mensagem: mensagemAviso('CONTEUDO_IGNORADO_ANTES', {}),
            });
        }
    }

    indicesCabecalho.forEach((inicio, ordem) => {
        const fim = indicesCabecalho[ordem + 1] ?? linhas.length;
        const cabecalho = linhas[inicio].replace(/^##\s+/, '').trim();
        const corpo = linhas.slice(inicio + 1, fim);
        const normalizado = semAcento(cabecalho).toLowerCase();

        if (normalizado === 'gabarito') {
            if (linhasGabarito === null) {
                linhasGabarito = corpo;
                return;
            }
            avisos.push({
                codigo: 'SECAO_DESCONHECIDA',
                mensagem: mensagemAviso('SECAO_DESCONHECIDA', {
                    titulo: cabecalho,
                }),
            });
            return;
        }

        if (!normalizado.startsWith('questao')) {
            avisos.push({
                codigo: 'SECAO_DESCONHECIDA',
                mensagem: mensagemAviso('SECAO_DESCONHECIDA', {
                    titulo: cabecalho,
                }),
            });
            return;
        }

        houveCabecalhoQuestao = true;
        const m = cabecalho.match(/^quest[aã]o\s+(\d+)\s*\(([^)]*)\)\s*$/i);
        if (!m) {
            avisos.push({
                codigo: 'CABECALHO_QUESTAO_MALFORMADO',
                mensagem: mensagemAviso('CABECALHO_QUESTAO_MALFORMADO', {
                    linha: linhas[inicio].trim(),
                }),
            });
            return;
        }

        const numero = Number.parseInt(m[1], 10);
        const tipoBruto = m[2].trim();
        const tipo = semAcento(tipoBruto)
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        if (tipo === 'multipla escolha') {
            questoes.push(parseMultiplaEscolha(numero, corpo, avisos));
        } else if (tipo === 'verdadeiro ou falso') {
            questoes.push(parseVerdadeiroFalso(numero, corpo, avisos));
        } else {
            avisos.push({
                codigo: 'TIPO_QUESTAO_DESCONHECIDO',
                mensagem: mensagemAviso('TIPO_QUESTAO_DESCONHECIDO', {
                    n: numero,
                    tipo: tipoBruto,
                }),
                questao: numero,
            });
        }
    });

    const foraDeSequencia = questoes.some(
        (questao, indice) => questao.numero !== indice + 1,
    );
    if (foraDeSequencia) {
        avisos.push({
            codigo: 'NUMERACAO_INESPERADA',
            mensagem: mensagemAviso('NUMERACAO_INESPERADA', {}),
        });
    }

    if (questoes.length === 0 && !houveCabecalhoQuestao) {
        avisos.push({
            codigo: 'SEM_QUESTOES',
            mensagem: mensagemAviso('SEM_QUESTOES', {}),
        });
    }

    if (questoes.length > 0) {
        if (linhasGabarito === null) {
            avisos.push({
                codigo: 'GABARITO_AUSENTE',
                mensagem: mensagemAviso('GABARITO_AUSENTE', {}),
            });
        } else {
            aplicarGabarito(questoes, linhasGabarito, avisos);
        }
    }

    const esperado = opcoes?.quantidadeEsperada;
    if (
        typeof esperado === 'number' &&
        esperado >= 1 &&
        esperado !== questoes.length
    ) {
        avisos.push({
            codigo: 'QUANTIDADE_DIVERGENTE',
            mensagem: mensagemAviso('QUANTIDADE_DIVERGENTE', {
                esperado,
                encontrado: questoes.length,
            }),
        });
    }

    return { questoes, avisos };
}
