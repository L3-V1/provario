<script setup lang="ts">
import { useDropZone, useFileDialog } from '@vueuse/core';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps<{
    modelValue: File | null;
    logoAtualUrl?: string | null;
    removida?: boolean;
    invalid?: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [File | null];
    remover: [];
}>();

const TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANHO_MAXIMO = 2 * 1024 * 1024;
const ACCEPT = TIPOS_ACEITOS.join(',');

const dropRef = ref<HTMLElement>();
const erroLocal = ref<string | null>(null);
const previewArquivo = ref<string | null>(null);

watch(
    () => props.modelValue,
    (arquivo) => {
        if (previewArquivo.value) {
            URL.revokeObjectURL(previewArquivo.value);
            previewArquivo.value = null;
        }
        if (arquivo) {
            previewArquivo.value = URL.createObjectURL(arquivo);
        }
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    if (previewArquivo.value) {
        URL.revokeObjectURL(previewArquivo.value);
    }
});

const previewUrl = computed<string | null>(() => {
    if (previewArquivo.value) {
        return previewArquivo.value;
    }
    if (props.logoAtualUrl && !props.removida) {
        return props.logoAtualUrl;
    }
    return null;
});

const temArquivoNovo = computed(() => props.modelValue !== null);

function validarEEmitir(arquivo: File | undefined | null) {
    if (!arquivo) {
        return;
    }
    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
        erroLocal.value = 'Formato inválido. Use PNG, JPG ou WEBP.';
        return;
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
        erroLocal.value = 'Arquivo muito grande. Máximo de 2 MB.';
        return;
    }
    erroLocal.value = null;
    emit('update:modelValue', arquivo);
}

const { open, onChange } = useFileDialog({ accept: ACCEPT, multiple: false });

onChange((arquivos) => {
    validarEEmitir(arquivos?.item(0));
});

const { isOverDropZone } = useDropZone(dropRef, {
    dataTypes: TIPOS_ACEITOS,
    onDrop: (arquivos) => {
        validarEEmitir(arquivos?.at(-1));
    },
});

function remover() {
    erroLocal.value = null;
    if (temArquivoNovo.value) {
        emit('update:modelValue', null);
    } else {
        emit('remover');
    }
}
</script>

<template>
    <div class="flex flex-col gap-2">
        <div
            v-if="previewUrl"
            class="border-surface-200 dark:border-surface-700 flex items-center gap-3 rounded border p-3"
        >
            <img
                :src="previewUrl"
                alt="Logo"
                class="size-16 rounded object-contain"
            />
            <Button
                type="button"
                label="Remover"
                icon="pi pi-trash"
                severity="danger"
                variant="text"
                @click="remover"
            />
        </div>

        <div
            ref="dropRef"
            role="button"
            tabindex="0"
            class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-4 py-8 text-center transition-colors"
            :class="[
                isOverDropZone
                    ? 'border-primary bg-primary-50 dark:bg-primary-950'
                    : 'border-surface-300 dark:border-surface-600 hover:border-surface-400 dark:hover:border-surface-500',
                invalid ? 'border-red-400 dark:border-red-500' : '',
            ]"
            @click="open()"
            @keydown.enter.prevent="open()"
            @keydown.space.prevent="open()"
        >
            <i class="pi pi-cloud-upload text-surface-400 text-2xl" />
            <span class="text-surface-600 dark:text-surface-300 text-sm">
                Arraste a imagem aqui ou clique para selecionar
            </span>
            <span class="text-surface-400 text-xs"
                >PNG, JPG ou WEBP até 2 MB</span
            >
        </div>

        <Message
            v-if="erroLocal"
            severity="error"
            variant="simple"
            size="small"
        >
            {{ erroLocal }}
        </Message>
    </div>
</template>
