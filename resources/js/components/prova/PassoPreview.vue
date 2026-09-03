<script setup lang="ts">
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { computed } from 'vue';
import type { CabecalhoProva, LayoutColunas } from '@/types/prova';
import GabaritoPreview from '@/components/prova/GabaritoPreview.vue';
import QuestaoPreview from '@/components/prova/QuestaoPreview.vue';
import { parseProva } from '@/lib/parserProva';

const props = defineProps<{
    cabecalho: CabecalhoProva;
    markdown: string;
    layout: LayoutColunas;
    quantidade: number | null;
}>();

const toast = useToast();

const temMarkdown = computed(() => props.markdown.trim().length > 0);

const prova = computed(() =>
    parseProva(props.markdown, { quantidadeEsperada: props.quantidade }),
);

function imprimir() {
    window.print();
}

async function copiarAvisos() {
    const texto = prova.value.avisos.map((aviso) => aviso.mensagem).join('\n');

    try {
        await navigator.clipboard.writeText(texto);
        toast.add({
            severity: 'success',
            summary: 'Avisos copiados',
            detail: 'Cole na I.A. que gerou o markdown e peça a correção.',
            life: 3000,
        });
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Não foi possível copiar',
            detail: 'Copie o texto manualmente.',
            life: 4000,
        });
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <Message severity="info" variant="simple">
            Confira a folha abaixo e clique em Imprimir. Na caixa de impressão
            do navegador, escolha "Salvar como PDF" para gerar um arquivo.
        </Message>

        <Message
            v-if="temMarkdown && prova.avisos.length"
            severity="warn"
            variant="simple"
        >
            <div class="flex flex-col items-start gap-2">
                <blockquote
                    class="w-full rounded-r border-l-4 border-red-500 bg-red-50 py-2 pr-3 pl-3 font-mono text-xs whitespace-pre-wrap text-red-700 dark:border-red-400 dark:bg-red-950/40 dark:text-red-300"
                >
                    <span
                        v-for="aviso in prova.avisos"
                        :key="aviso.mensagem"
                        class="block"
                    >
                        {{ aviso.mensagem }}
                    </span>
                </blockquote>
                <Button
                    label="Copiar avisos"
                    icon="pi pi-copy"
                    size="small"
                    severity="secondary"
                    @click="copiarAvisos"
                />
            </div>
        </Message>

        <div>
            <Button label="Imprimir" icon="pi pi-print" @click="imprimir" />
        </div>

        <div class="folha-wrap overflow-x-auto">
            <div class="folha-impressao">
                <header class="mb-4">
                    <div
                        class="flex flex-col items-center gap-1 text-center text-sm"
                    >
                        <img
                            v-if="props.cabecalho.logo_url"
                            :src="props.cabecalho.logo_url"
                            alt="Logo"
                            class="h-16 w-16 object-contain"
                        />
                        <span
                            v-if="props.cabecalho.instituicao"
                            class="font-semibold"
                        >
                            {{ props.cabecalho.instituicao }}
                        </span>
                        <span v-if="props.cabecalho.escola">{{
                            props.cabecalho.escola
                        }}</span>
                    </div>

                    <div
                        v-if="
                            props.cabecalho.professor ||
                            props.cabecalho.disciplina
                        "
                        class="mt-3 flex justify-between gap-6 text-sm"
                    >
                        <span v-if="props.cabecalho.professor">
                            <span class="font-medium">Professor(a):</span>
                            {{ props.cabecalho.professor }}
                        </span>
                        <span v-if="props.cabecalho.disciplina">
                            <span class="font-medium">Disciplina:</span>
                            {{ props.cabecalho.disciplina }}
                        </span>
                    </div>

                    <hr class="mt-2 border-t border-black" />

                    <div class="mt-3 text-center text-sm">
                        <span
                            v-if="props.cabecalho.titulo"
                            class="text-lg font-bold"
                        >
                            {{ props.cabecalho.titulo }}
                        </span>
                        <span v-if="props.cabecalho.valor_total" class="ml-2">
                            <span class="font-medium">Valor:</span>
                            {{ props.cabecalho.valor_total }}
                        </span>
                        <span class="ml-2">
                            <span class="font-medium">Nota:</span>
                            <span
                                class="ml-1 inline-block w-24 border-b border-black"
                                >&nbsp;</span
                            >
                        </span>
                    </div>
                </header>

                <dl class="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div class="flex items-baseline gap-2">
                        <dt>Nome:</dt>
                        <dd class="flex-1 border-b border-black">&nbsp;</dd>
                    </div>
                    <div class="flex items-baseline gap-2">
                        <dt>Turma:</dt>
                        <dd class="flex-1 border-b border-black">&nbsp;</dd>
                    </div>
                    <div class="flex items-baseline gap-2">
                        <dt class="whitespace-nowrap">Data:</dt>
                        <dd class="flex-1">__/__/__</dd>
                    </div>
                    <div class="flex items-baseline gap-2">
                        <dt>Período:</dt>
                        <dd class="flex-1">{{ props.cabecalho.bimestre }}</dd>
                    </div>
                </dl>

                <p v-if="!temMarkdown" class="text-sm">
                    Nenhum markdown colado ainda.
                </p>

                <template v-else>
                    <div
                        class="folha-questoes"
                        :style="
                            props.layout === 2
                                ? 'column-count: 2; column-gap: 2rem;'
                                : ''
                        "
                    >
                        <QuestaoPreview
                            v-for="questao in prova.questoes"
                            :key="questao.numero"
                            :questao="questao"
                            class="mb-6"
                        />
                    </div>

                    <section
                        v-if="prova.questoes.length"
                        class="folha-gabarito mt-6 border-t border-black pt-4"
                    >
                        <p class="mb-2 font-semibold">Gabarito</p>
                        <GabaritoPreview :questoes="prova.questoes" />
                    </section>
                </template>
            </div>
        </div>
    </div>
</template>
