<script setup lang="ts">
import type { Questao } from '@/types/prova';

defineProps<{ questoes: Questao[] }>();

function resposta(questao: Questao): string {
    if (questao.tipo === 'multipla-escolha') {
        return questao.gabarito ?? '—';
    }

    if (questao.afirmacoes.length === 0) {
        return '—';
    }

    return questao.afirmacoes
        .map((afirmacao) => `${afirmacao.numero}-${afirmacao.gabarito ?? '—'}`)
        .join(', ');
}
</script>

<template>
    <ol class="flex flex-col gap-1 text-sm">
        <li v-for="questao in questoes" :key="questao.numero">
            {{ questao.numero }}. {{ resposta(questao) }}
        </li>
    </ol>
</template>
