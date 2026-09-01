<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useConfirm } from 'primevue/useconfirm';
import { computed } from 'vue';
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import PassoConfiguracao from '@/components/prova/PassoConfiguracao.vue';
import PassoConteudo from '@/components/prova/PassoConteudo.vue';
import PassoPreview from '@/components/prova/PassoPreview.vue';
import PassoPrompt from '@/components/prova/PassoPrompt.vue';
import { useRascunhoProva } from '@/composables/useRascunhoProva';
import type { PerfilResumo } from '@/types/prova';

defineProps<{ perfis: PerfilResumo[] }>();

const { rascunho, limparRascunho } = useRascunhoProva();

const confirm = useConfirm();

const passos = [
    'Configuração',
    'Prompt',
    'Conteúdo e cabeçalho',
    'Pré-visualização',
];

const configValida = computed(
    () =>
        !!rascunho.config.materia &&
        !!rascunho.config.ano &&
        !!rascunho.config.conteudo.trim() &&
        !!rascunho.config.quantidade &&
        rascunho.config.quantidade >= 1,
);

// Passo atual (1..4) só pode avançar se o passo corrente for válido.
const podeAvancar = computed(() => {
    if (rascunho.passoAtual === 1) {
        return configValida.value;
    }

    return rascunho.passoAtual < passos.length;
});

function irPara(passo: number) {
    if (passo < rascunho.passoAtual) {
        rascunho.passoAtual = passo;
        return;
    }

    if (passo === rascunho.passoAtual + 1 && podeAvancar.value) {
        rascunho.passoAtual = passo;
    }
}

function avancar() {
    irPara(rascunho.passoAtual + 1);
}

function voltar() {
    irPara(rascunho.passoAtual - 1);
}

function confirmarNovaProva() {
    confirm.require({
        header: 'Nova prova',
        message:
            'Isso apaga o rascunho atual (configuração, markdown e cabeçalho) e recomeça do passo 1. Continuar?',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Apagar e recomeçar',
        rejectLabel: 'Cancelar',
        acceptProps: { severity: 'danger' },
        accept: () => limparRascunho(),
    });
}
</script>

<template>
    <Head title="Criar prova" />

    <div class="space-y-4">
        <Breadcrumbs :items="[{ label: 'Criar prova' }]" />

        <ol class="flex flex-wrap gap-2 text-sm">
            <li
                v-for="(rotulo, indice) in passos"
                :key="rotulo"
                class="flex items-center gap-2 rounded-md px-3 py-1"
                :class="
                    indice + 1 === rascunho.passoAtual
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-surface-500'
                "
            >
                <span
                    class="flex size-5 items-center justify-center rounded-full border text-xs"
                >
                    {{ indice + 1 }}
                </span>
                {{ rotulo }}
            </li>
        </ol>

        <Card class="w-full">
            <template #content>
                <PassoConfiguracao
                    v-if="rascunho.passoAtual === 1"
                    v-model="rascunho.config"
                />

                <PassoPrompt
                    v-else-if="rascunho.passoAtual === 2"
                    :config="rascunho.config"
                />

                <PassoConteudo
                    v-else-if="rascunho.passoAtual === 3"
                    v-model:markdown="rascunho.conteudo.markdown"
                    v-model:cabecalho="rascunho.cabecalho"
                    v-model:layout="rascunho.layout"
                    :perfis="perfis"
                    :materia="rascunho.config.materia"
                />

                <PassoPreview
                    v-else
                    :cabecalho="rascunho.cabecalho"
                    :markdown="rascunho.conteudo.markdown"
                    :layout="rascunho.layout"
                />

                <div class="mt-6 flex justify-between">
                    <Button
                        label="Voltar"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        variant="outlined"
                        :disabled="rascunho.passoAtual === 1"
                        @click="voltar"
                    />
                    <Button
                        v-if="rascunho.passoAtual < passos.length"
                        label="Avançar"
                        icon="pi pi-arrow-right"
                        icon-pos="right"
                        :disabled="!podeAvancar"
                        @click="avancar"
                    />
                    <Button
                        v-else
                        label="Nova prova"
                        icon="pi pi-trash"
                        severity="danger"
                        variant="outlined"
                        @click="confirmarNovaProva"
                    />
                </div>
            </template>
        </Card>
    </div>
</template>
