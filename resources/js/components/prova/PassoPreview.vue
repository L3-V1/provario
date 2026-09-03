<script setup lang="ts">
import Button from 'primevue/button';
import Message from 'primevue/message';
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

const temMarkdown = computed(() => props.markdown.trim().length > 0);

const prova = computed(() =>
    parseProva(props.markdown, { quantidadeEsperada: props.quantidade }),
);

function imprimir() {
    window.print();
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <Message severity="info" variant="simple">
            Confira a folha abaixo e clique em Imprimir. Na caixa de impressão do
            navegador, escolha "Salvar como PDF" para gerar um arquivo.
        </Message>

        <Message
            v-if="temMarkdown && prova.avisos.length"
            severity="warn"
            variant="simple"
        >
            <ul class="flex flex-col gap-1">
                <li v-for="aviso in prova.avisos" :key="aviso.mensagem">
                    {{ aviso.mensagem }}
                </li>
            </ul>
        </Message>

        <div>
            <Button label="Imprimir" icon="pi pi-print" @click="imprimir" />
        </div>

        <div class="folha-wrap overflow-x-auto">
            <div class="folha-impressao">
                <header
                    class="mb-4 flex items-start gap-4 border-b border-black pb-4"
                >
                    <img
                        v-if="props.cabecalho.logo_url"
                        :src="props.cabecalho.logo_url"
                        alt="Logo"
                        class="h-16 w-16 object-contain"
                    />
                    <div class="flex flex-col text-sm">
                        <span
                            v-if="props.cabecalho.instituicao"
                            class="font-semibold"
                        >
                            {{ props.cabecalho.instituicao }}
                        </span>
                        <span v-if="props.cabecalho.escola">{{
                            props.cabecalho.escola
                        }}</span>
                        <span v-if="props.cabecalho.disciplina">
                            Disciplina: {{ props.cabecalho.disciplina }}
                        </span>
                        <span v-if="props.cabecalho.professor">
                            Professor(a): {{ props.cabecalho.professor }}
                        </span>
                        <span v-if="props.cabecalho.bimestre">
                            Período: {{ props.cabecalho.bimestre }}
                        </span>
                        <span v-if="props.cabecalho.valor_total">
                            Valor: {{ props.cabecalho.valor_total }}
                        </span>
                    </div>
                </header>

                <h2
                    v-if="props.cabecalho.titulo"
                    class="mb-3 text-center text-lg font-bold"
                >
                    {{ props.cabecalho.titulo }}
                </h2>

                <dl class="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>Nome: _______________________________</div>
                    <div>Turma: ____________</div>
                    <div>Data: ____ / ____ / ________</div>
                    <div>Nota: ____________</div>
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
