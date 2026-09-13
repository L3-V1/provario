<script setup lang="ts">
import Card from 'primevue/card';

const passos = [
    {
        titulo: 'Configurar',
        emoji: '⚙️',
        descricao:
            'Escolha matéria, ano, quantidade de questões e o conteúdo a cobrar.',
    },
    {
        titulo: 'Gerar prompt',
        emoji: '🤖',
        descricao:
            'O sistema monta um prompt pronto para colar em um chat de I.A.',
    },
    {
        titulo: 'Colar o markdown da I.A.',
        emoji: '📋',
        descricao:
            'Cole de volta a resposta da I.A. no formato de markdown combinado.',
    },
    {
        titulo: 'Pré-visualizar e imprimir',
        emoji: '🖨️',
        descricao:
            'Confira a prova no template A4 e salve ou imprima pelo navegador.',
    },
];
</script>

<template>
    <Card class="w-full">
        <template #title>🧭 Como funciona</template>

        <template #content>
            <ol class="flex flex-col gap-4">
                <li
                    v-for="(passo, indice) in passos"
                    :key="passo.titulo"
                    class="flex gap-3"
                >
                    <span
                        class="bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    >
                        {{ indice + 1 }}
                    </span>
                    <div>
                        <p
                            class="text-surface-900 dark:text-surface-0 font-medium"
                        >
                            <span aria-hidden="true">{{ passo.emoji }}</span>
                            {{ passo.titulo }}
                        </p>
                        <p
                            class="text-surface-600 dark:text-surface-300 text-sm"
                        >
                            {{ passo.descricao }}
                        </p>
                    </div>
                </li>
            </ol>

            <div
                class="border-surface-200 bg-surface-50 text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 mt-4 rounded-md border p-3 text-sm"
            >
                <p
                    class="text-surface-900 dark:text-surface-0 mb-1 font-medium"
                >
                    Lembrete do formato do markdown
                </p>
                <ul class="list-disc pl-4">
                    <li>
                        Cada questão começa com
                        <code>## Questão N (múltipla escolha)</code> ou
                        <code>## Questão N (verdadeiro ou falso)</code>.
                    </li>
                    <li>
                        Múltipla escolha: alternativas em linhas
                        <code>a)</code> a <code>e)</code>.
                    </li>
                    <li>
                        Verdadeiro ou falso: afirmações em linhas
                        <code>N. ( ) texto</code>.
                    </li>
                    <li>
                        Ao final, uma seção <code>## Gabarito</code> com uma
                        linha de resposta por questão.
                    </li>
                    <li>
                        Formatação inline: apenas <code>**negrito**</code> e
                        <code>*itálico*</code>.
                    </li>
                </ul>
            </div>
        </template>
    </Card>
</template>
