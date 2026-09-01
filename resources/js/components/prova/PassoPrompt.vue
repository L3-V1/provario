<script setup lang="ts">
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { computed } from 'vue';
import { buildPromptProva } from '@/lib/promptProva';
import type { ConfigProva } from '@/types/prova';

const props = defineProps<{ config: ConfigProva }>();

const toast = useToast();

const prompt = computed(() => buildPromptProva(props.config));

async function copiar() {
    try {
        await navigator.clipboard.writeText(prompt.value);
        toast.add({
            severity: 'success',
            summary: 'Prompt copiado',
            detail: 'Cole em um chat de I.A. para gerar as questões.',
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
    <div class="flex flex-col gap-3">
        <p class="text-surface-500 text-sm">
            Copie o prompt abaixo e cole em um chat de I.A. Depois traga o
            markdown gerado para o próximo passo.
        </p>

        <Textarea
            :model-value="prompt"
            readonly
            rows="16"
            class="font-mono text-sm"
            fluid
        />

        <div>
            <Button label="Copiar prompt" icon="pi pi-copy" @click="copiar" />
        </div>
    </div>
</template>
