import { describe, expect, it } from 'vitest';
import { parseProva, segmentar } from '@/lib/parserProva';

const EXEMPLO = `## Questão 1 (múltipla escolha)
Qual é a capital do Brasil?

a) São Paulo
b) Rio de Janeiro
c) Brasília
d) Salvador

## Questão 2 (verdadeiro ou falso)
Julgue as afirmações:

1. ( ) O Sol é uma estrela.
2. ( ) A Terra é plana.

## Gabarito
1. c
2. 1-V, 2-F
`;

const codigos = (markdown: string, opcoes?: Parameters<typeof parseProva>[1]) =>
    parseProva(markdown, opcoes).avisos.map((a) => a.codigo);

describe('segmentar — formatação inline', () => {
    it('2.1 **negrito** vira um segmento negrito', () => {
        expect(segmentar('**negrito**')).toEqual([
            { texto: 'negrito', negrito: true },
        ]);
    });

    it('2.2 *itálico* e ***ambos***', () => {
        expect(segmentar('*itálico*')).toEqual([
            { texto: 'itálico', italico: true },
        ]);
        expect(segmentar('***ambos***')).toEqual([
            { texto: 'ambos', negrito: true, italico: true },
        ]);
    });

    it('2.3 texto misto segmenta antes/entre/depois dos marcadores', () => {
        expect(segmentar('antes **bold** meio *it* fim')).toEqual([
            { texto: 'antes ' },
            { texto: 'bold', negrito: true },
            { texto: ' meio ' },
            { texto: 'it', italico: true },
            { texto: ' fim' },
        ]);
    });

    it('2.4 marcador sem fechamento na linha vira literal', () => {
        expect(segmentar('isto **não fecha')).toEqual([
            { texto: 'isto **não fecha' },
        ]);
        expect(segmentar('a *b')).toEqual([{ texto: 'a *b' }]);
    });

    it('2.5 "2 * 3" com espaços colados ao * fica literal', () => {
        expect(segmentar('2 * 3')).toEqual([{ texto: '2 * 3' }]);
        expect(segmentar('a * b * c')).toEqual([{ texto: 'a * b * c' }]);
    });

    it('2.6 outros marcadores markdown entram como texto puro', () => {
        for (const entrada of [
            '# título',
            '- item',
            '`código`',
            '_x_',
            '[x](y)',
            '![x](y)',
            '| a | b |',
        ]) {
            expect(segmentar(entrada)).toEqual([{ texto: entrada }]);
        }
    });

    it('2.7 entrada vazia retorna [{ texto: "" }]', () => {
        expect(segmentar('')).toEqual([{ texto: '' }]);
    });
});

describe('parseProva — estrutura de blocos e questões', () => {
    it('3.1 exemplo da constituição vira 2 questões tipadas', () => {
        const { questoes } = parseProva(EXEMPLO);
        expect(questoes).toHaveLength(2);
        expect(questoes[0].tipo).toBe('multipla-escolha');
        expect(questoes[1].tipo).toBe('verdadeiro-falso');
        expect(questoes[0].enunciado).toEqual([
            { texto: 'Qual é a capital do Brasil?' },
        ]);
        expect(questoes[0].numero).toBe(1);
        expect(questoes[1].numero).toBe(2);
    });

    it('3.2 MC tem 4 alternativas a–d com texto segmentado', () => {
        const q = parseProva(EXEMPLO).questoes[0];
        if (q.tipo !== 'multipla-escolha') throw new Error('tipo errado');
        expect(q.alternativas.map((a) => a.letra)).toEqual([
            'a',
            'b',
            'c',
            'd',
        ]);
        expect(q.alternativas[0].texto).toEqual([{ texto: 'São Paulo' }]);
    });

    it('3.3 V/F tem 2 afirmações numeradas com texto segmentado', () => {
        const q = parseProva(EXEMPLO).questoes[1];
        if (q.tipo !== 'verdadeiro-falso') throw new Error('tipo errado');
        expect(q.afirmacoes.map((a) => a.numero)).toEqual([1, 2]);
        expect(q.afirmacoes[0].texto).toEqual([
            { texto: 'O Sol é uma estrela.' },
        ]);
    });

    it('3.4 markdown vazio → SEM_QUESTOES e questoes: []', () => {
        const p = parseProva('   \n  \n');
        expect(p.questoes).toEqual([]);
        expect(p.avisos.map((a) => a.codigo)).toContain('SEM_QUESTOES');
    });

    it('3.5 tipo desconhecido → TIPO_QUESTAO_DESCONHECIDO', () => {
        expect(codigos('## Questão 1 (charada)\nenunciado\n')).toContain(
            'TIPO_QUESTAO_DESCONHECIDO',
        );
    });

    it('3.6 cabeçalho sem número → CABECALHO_QUESTAO_MALFORMADO', () => {
        expect(
            codigos('## Questão (múltipla escolha)\na) x\nb) y\n'),
        ).toContain('CABECALHO_QUESTAO_MALFORMADO');
    });

    it('3.7 MC sem alternativas → aviso e questão só com enunciado', () => {
        const p = parseProva('## Questão 1 (múltipla escolha)\nSó enunciado\n');
        expect(p.avisos.map((a) => a.codigo)).toContain(
            'MULTIPLA_ESCOLHA_SEM_ALTERNATIVAS',
        );
        const q = p.questoes[0];
        if (q.tipo !== 'multipla-escolha') throw new Error('tipo errado');
        expect(q.alternativas).toEqual([]);
        expect(q.enunciado).toEqual([{ texto: 'Só enunciado' }]);
    });

    it('3.8 MC com 1 alternativa → ALTERNATIVAS_INSUFICIENTES', () => {
        expect(
            codigos('## Questão 1 (múltipla escolha)\nx\n\na) única\n'),
        ).toContain('ALTERNATIVAS_INSUFICIENTES');
    });

    it('3.9 alternativas fora de ordem → aviso, todas na ordem lida', () => {
        const p = parseProva(
            '## Questão 1 (múltipla escolha)\nx\n\na) A\nc) C\nb) B\n',
        );
        expect(p.avisos.map((a) => a.codigo)).toContain(
            'ALTERNATIVA_FORA_DE_ORDEM',
        );
        const q = p.questoes[0];
        if (q.tipo !== 'multipla-escolha') throw new Error('tipo errado');
        expect(q.alternativas.map((a) => a.letra)).toEqual(['a', 'c', 'b']);
    });

    it('3.10 V/F sem afirmações → VF_SEM_AFIRMACOES', () => {
        expect(
            codigos('## Questão 1 (verdadeiro ou falso)\nSó enunciado\n'),
        ).toContain('VF_SEM_AFIRMACOES');
    });

    it('3.11 numeração 1, 3 → NUMERACAO_INESPERADA', () => {
        const md =
            '## Questão 1 (múltipla escolha)\nx\n\na) A\nb) B\n\n' +
            '## Questão 3 (múltipla escolha)\ny\n\na) A\nb) B\n';
        expect(codigos(md)).toContain('NUMERACAO_INESPERADA');
    });

    it('3.12 texto antes da 1ª questão → CONTEUDO_IGNORADO_ANTES', () => {
        expect(
            codigos(
                'bla bla\n\n## Questão 1 (múltipla escolha)\nx\n\na) A\nb) B\n',
            ),
        ).toContain('CONTEUDO_IGNORADO_ANTES');
    });

    it('3.13 ## Anexo no meio → SECAO_DESCONHECIDA, bloco ignorado', () => {
        const md =
            '## Questão 1 (múltipla escolha)\nx\n\na) A\nb) B\n\n' +
            '## Anexo\nqualquer coisa\n\n' +
            '## Questão 2 (múltipla escolha)\ny\n\na) A\nb) B\n';
        const p = parseProva(md);
        const aviso = p.avisos.find((a) => a.codigo === 'SECAO_DESCONHECIDA');
        expect(aviso).toBeDefined();
        expect(aviso?.mensagem).toContain('Anexo');
        expect(p.questoes).toHaveLength(2);
    });

    it('3.14 \\r\\n e espaços à direita parseiam igual ao \\n limpo', () => {
        const sujo = EXEMPLO.replace(/\n/g, '  \r\n');
        expect(parseProva(sujo)).toEqual(parseProva(EXEMPLO));
    });

    it('3.15 enunciado multi-linha termina na 1ª linha de alternativa', () => {
        const q = parseProva(
            '## Questão 1 (múltipla escolha)\nlinha um\nlinha dois\na) A\nb) B\n',
        ).questoes[0];
        expect(q.enunciado).toEqual([{ texto: 'linha um linha dois' }]);
    });
});

const SEM_GABARITO = EXEMPLO.slice(0, EXEMPLO.indexOf('## Gabarito'));

describe('parseProva — gabarito e quantidade', () => {
    it('4.1 exemplo preenche gabaritos e não gera avisos', () => {
        const p = parseProva(EXEMPLO);
        expect(p.avisos).toEqual([]);
        const q1 = p.questoes[0];
        const q2 = p.questoes[1];
        if (q1.tipo !== 'multipla-escolha') throw new Error('tipo errado');
        if (q2.tipo !== 'verdadeiro-falso') throw new Error('tipo errado');
        expect(q1.gabarito).toBe('c');
        expect(q2.afirmacoes.map((a) => a.gabarito)).toEqual(['V', 'F']);
    });

    it('4.2 sem ## Gabarito → um único GABARITO_AUSENTE', () => {
        const cods = codigos(SEM_GABARITO);
        expect(cods.filter((c) => c === 'GABARITO_AUSENTE')).toHaveLength(1);
        expect(cods).not.toContain('GABARITO_INCOMPLETO');
    });

    it('4.3 gabarito sem a linha de uma questão → GABARITO_INCOMPLETO', () => {
        const p = parseProva(`${SEM_GABARITO}## Gabarito\n1. c\n`);
        const aviso = p.avisos.find((a) => a.codigo === 'GABARITO_INCOMPLETO');
        expect(aviso?.questao).toBe(2);
    });

    it('4.4 MC "1. xyz" → GABARITO_NAO_RECONHECIDO e gabarito null', () => {
        const p = parseProva(
            `${SEM_GABARITO}## Gabarito\n1. xyz\n2. 1-V, 2-F\n`,
        );
        expect(p.avisos.map((a) => a.codigo)).toContain(
            'GABARITO_NAO_RECONHECIDO',
        );
        const q1 = p.questoes[0];
        if (q1.tipo !== 'multipla-escolha') throw new Error('tipo errado');
        expect(q1.gabarito).toBeNull();
    });

    it('4.5 V/F com par faltando → GABARITO_VF_DIVERGENTE', () => {
        const p = parseProva(`${SEM_GABARITO}## Gabarito\n1. c\n2. 1-V\n`);
        const aviso = p.avisos.find(
            (a) => a.codigo === 'GABARITO_VF_DIVERGENTE',
        );
        expect(aviso?.questao).toBe(2);
    });

    it('4.6 V/F aceita variações de formato', () => {
        const md =
            '## Questão 1 (verdadeiro ou falso)\nx\n\n' +
            '1. ( ) a\n2. ( ) b\n\n## Gabarito\n1. 1: v, 2 F\n';
        const q = parseProva(md).questoes[0];
        if (q.tipo !== 'verdadeiro-falso') throw new Error('tipo errado');
        expect(q.afirmacoes.map((a) => a.gabarito)).toEqual(['V', 'F']);
    });

    it('4.7 "3. a" sem questão 3 → GABARITO_SOBRANDO', () => {
        const p = parseProva(`${EXEMPLO}3. a\n`);
        expect(p.avisos.map((a) => a.codigo)).toContain('GABARITO_SOBRANDO');
    });

    it('4.8 quantidadeEsperada igual → sem QUANTIDADE_DIVERGENTE', () => {
        expect(codigos(EXEMPLO, { quantidadeEsperada: 2 })).not.toContain(
            'QUANTIDADE_DIVERGENTE',
        );
    });

    it('4.9 quantidadeEsperada divergente → aviso citando os números', () => {
        const p = parseProva(EXEMPLO, { quantidadeEsperada: 5 });
        const aviso = p.avisos.find(
            (a) => a.codigo === 'QUANTIDADE_DIVERGENTE',
        );
        expect(aviso?.mensagem).toContain('5');
        expect(aviso?.mensagem).toContain('2');
        expect(p.questoes).toHaveLength(2);
    });
});
