<script setup lang="ts">
import Message from 'primevue/message';
import type { CabecalhoProva, LayoutColunas } from '@/types/prova';

const props = defineProps<{
    cabecalho: CabecalhoProva;
    markdown: string;
    layout: LayoutColunas;
}>();
</script>

<template>
    <div class="flex flex-col gap-4">
        <Message severity="info" variant="simple">
            Pré-visualização parcial: o markdown aparece como texto puro. A
            prova formatada e a impressão chegam nas próximas etapas do projeto.
        </Message>

        <div
            class="border-surface-200 dark:border-surface-700 rounded border p-6"
        >
            <header
                class="border-surface-200 dark:border-surface-700 mb-4 flex items-start gap-4 border-b pb-4"
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

            <pre
                class="text-sm whitespace-pre-wrap"
                :style="
                    props.layout === 2
                        ? 'column-count: 2; column-gap: 2rem;'
                        : ''
                "
                >{{ props.markdown || 'Nenhum markdown colado ainda.' }}</pre>
        </div>
    </div>
</template>
