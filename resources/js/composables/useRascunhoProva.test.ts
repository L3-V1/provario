import { describe, expect, it } from 'vitest';
import { useRascunhoProva } from '@/composables/useRascunhoProva';

describe('useRascunhoProva - temRascunho (AC-02, AC-13)', () => {
    it('expõe rascunho, temRascunho e limparRascunho', () => {
        const { rascunho, temRascunho, limparRascunho } = useRascunhoProva();

        expect(rascunho).toBeTypeOf('object');
        expect(temRascunho).toBeTypeOf('object'); // ref/computed
        expect(limparRascunho).toBeTypeOf('function');
    });

    it('é false no estado inicial', () => {
        const { temRascunho, limparRascunho } = useRascunhoProva();
        limparRascunho();

        expect(temRascunho.value).toBe(false);
    });

    it('é true quando passoAtual > 1', () => {
        const { rascunho, temRascunho, limparRascunho } = useRascunhoProva();
        limparRascunho();

        rascunho.passoAtual = 2;

        expect(temRascunho.value).toBe(true);
    });

    it('é true quando config.materia está preenchida', () => {
        const { rascunho, temRascunho, limparRascunho } = useRascunhoProva();
        limparRascunho();

        rascunho.config.materia = 'Matemática';

        expect(temRascunho.value).toBe(true);
    });

    it('é true quando config.ano está preenchido', () => {
        const { rascunho, temRascunho, limparRascunho } = useRascunhoProva();
        limparRascunho();

        rascunho.config.ano = 5;

        expect(temRascunho.value).toBe(true);
    });

    it('é true quando config.quantidade está preenchida', () => {
        const { rascunho, temRascunho, limparRascunho } = useRascunhoProva();
        limparRascunho();

        rascunho.config.quantidade = 10;

        expect(temRascunho.value).toBe(true);
    });

    it('é true quando o markdown colado não está vazio após trim', () => {
        const { rascunho, temRascunho, limparRascunho } = useRascunhoProva();
        limparRascunho();

        rascunho.conteudo.markdown = '   \n  ';
        expect(temRascunho.value).toBe(false);

        rascunho.conteudo.markdown = '## Questão 1';
        expect(temRascunho.value).toBe(true);
    });

    it('volta a false após limparRascunho()', () => {
        const { rascunho, temRascunho, limparRascunho } = useRascunhoProva();

        rascunho.passoAtual = 3;
        rascunho.config.materia = 'História';
        expect(temRascunho.value).toBe(true);

        limparRascunho();

        expect(temRascunho.value).toBe(false);
    });
});
