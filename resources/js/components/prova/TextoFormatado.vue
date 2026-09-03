<script setup lang="ts">
import type { TextoFormatado } from '@/types/prova';

defineProps<{ segmentos: TextoFormatado }>();
</script>

<template>
    <span>
        <template v-for="(segmento, indice) in segmentos" :key="indice">
            <strong v-if="segmento.negrito && segmento.italico">
                <em>{{ segmento.texto }}</em>
            </strong>
            <strong v-else-if="segmento.negrito">{{ segmento.texto }}</strong>
            <em v-else-if="segmento.italico">{{ segmento.texto }}</em>
            <span v-else>{{ segmento.texto }}</span>
        </template>
    </span>
</template>
