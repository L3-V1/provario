<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { onMounted, onUnmounted } from 'vue';
import type { FlashToast } from '@/types';

const toast = useToast();

const severityMap: Record<FlashToast['type'], string> = {
    success: 'success',
    info: 'info',
    warning: 'warn',
    error: 'error',
};

const summaryMap: Record<FlashToast['type'], string> = {
    success: 'Sucesso',
    info: 'Informação',
    warning: 'Atenção',
    error: 'Erro',
};

let stop: (() => void) | undefined;

onMounted(() => {
    stop = router.on('flash', (event) => {
        const data = (event as CustomEvent).detail?.flash?.toast as
            | FlashToast
            | undefined;

        if (!data) {
            return;
        }

        toast.add({
            severity: severityMap[data.type],
            summary: summaryMap[data.type],
            detail: data.message,
            life: 4000,
        });
    });
});

onUnmounted(() => stop?.());
</script>

<template>
    <Toast position="top-right" />
</template>
