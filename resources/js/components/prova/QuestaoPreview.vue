<script setup lang="ts">
import type { Questao } from '@/types/prova';
import TextoFormatado from '@/components/prova/TextoFormatado.vue';

defineProps<{ questao: Questao }>();
</script>

<template>
    <div class="folha-questao flex break-inside-avoid flex-col gap-2">
        <p class="font-semibold">Questão {{ questao.numero }}</p>

        <p class="text-sm">
            <TextoFormatado :segmentos="questao.enunciado" />
        </p>

        <ol
            v-if="questao.tipo === 'multipla-escolha'"
            class="flex break-inside-avoid flex-col gap-1 text-sm"
        >
            <li
                v-for="alternativa in questao.alternativas"
                :key="alternativa.letra"
            >
                {{ alternativa.letra }})
                <TextoFormatado :segmentos="alternativa.texto" />
            </li>
        </ol>

        <ul v-else class="flex break-inside-avoid flex-col gap-1 text-sm">
            <li v-for="afirmacao in questao.afirmacoes" :key="afirmacao.numero">
                {{ afirmacao.numero }}. ( )
                <TextoFormatado :segmentos="afirmacao.texto" />
            </li>
        </ul>
    </div>
</template>
