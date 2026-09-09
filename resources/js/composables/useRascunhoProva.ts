import { computed, reactive, watch } from 'vue';
import type { RascunhoProva } from '@/types/prova';

const STORAGE_KEY = 'provario:rascunho-prova';
const DEBOUNCE_MS = 200;

function estadoInicial(): RascunhoProva {
    return {
        versao: 1,
        passoAtual: 1,
        config: { materia: null, ano: null, conteudo: '', quantidade: null },
        conteudo: { markdown: '' },
        cabecalho: {
            perfil_id: null,
            logo_url: null,
            instituicao: '',
            escola: '',
            disciplina: '',
            professor: '',
            titulo: '',
            bimestre: '',
            valor_total: '',
        },
        layout: 1,
    };
}

/**
 * Lê o rascunho salvo no localStorage. Tolerante a ausência da chave, JSON
 * inválido ou versão de schema diferente — nesses casos devolve o estado
 * inicial vazio sem lançar.
 */
function carregar(): RascunhoProva {
    if (typeof window === 'undefined') {
        return estadoInicial();
    }

    try {
        const bruto = window.localStorage.getItem(STORAGE_KEY);

        if (!bruto) {
            return estadoInicial();
        }

        const salvo = JSON.parse(bruto) as Partial<RascunhoProva>;

        if (salvo.versao !== 1) {
            return estadoInicial();
        }

        const inicial = estadoInicial();

        return {
            ...inicial,
            ...salvo,
            config: { ...inicial.config, ...salvo.config },
            conteudo: { ...inicial.conteudo, ...salvo.conteudo },
            cabecalho: { ...inicial.cabecalho, ...salvo.cabecalho },
        };
    } catch {
        return estadoInicial();
    }
}

let timer: ReturnType<typeof setTimeout> | undefined;

export function useRascunhoProva() {
    const rascunho = reactive<RascunhoProva>(carregar());

    watch(
        rascunho,
        (valor) => {
            if (typeof window === 'undefined') {
                return;
            }

            if (timer) {
                clearTimeout(timer);
            }

            timer = setTimeout(() => {
                try {
                    window.localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(valor),
                    );
                } catch {
                    // storage cheio ou indisponível — rascunho segue em memória
                }
            }, DEBOUNCE_MS);
        },
        { deep: true },
    );

    /**
     * Indica se há um rascunho de prova em andamento (AC-02): passo além do
     * primeiro, algum campo de configuração preenchido ou markdown já colado.
     */
    const temRascunho = computed(
        () =>
            rascunho.passoAtual > 1 ||
            rascunho.config.materia !== null ||
            rascunho.config.ano !== null ||
            rascunho.config.quantidade !== null ||
            rascunho.conteudo.markdown.trim() !== '',
    );

    /** Limpa o rascunho. Só deve ser chamado pelo botão "Nova prova". */
    function limparRascunho(): void {
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.removeItem(STORAGE_KEY);
            } catch {
                // ignore
            }
        }

        Object.assign(rascunho, estadoInicial());
    }

    return { rascunho, temRascunho, limparRascunho };
}
