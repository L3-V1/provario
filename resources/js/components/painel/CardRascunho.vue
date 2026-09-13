<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useConfirm } from 'primevue/useconfirm';
import { route } from 'ziggy-js';
import { useRascunhoProva } from '@/composables/useRascunhoProva';

const { rascunho, temRascunho, limparRascunho } = useRascunhoProva();

const confirm = useConfirm();

function confirmarNovaProva() {
    confirm.require({
        header: 'Nova prova',
        message:
            'Isto descarta o rascunho em andamento e começa uma prova nova. Deseja continuar?',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancelar',
        acceptLabel: 'Descartar rascunho',
        acceptClass: 'p-button-danger',
        accept: () => limparRascunho(),
    });
}
</script>

<template>
    <Card class="w-full">
        <template #title>📝 Rascunho de prova</template>

        <template #content>
            <div v-if="temRascunho" class="flex flex-col gap-4">
                <dl class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <dt class="text-surface-500 dark:text-surface-400">
                            Matéria
                        </dt>
                        <dd class="text-surface-900 dark:text-surface-0">
                            {{ rascunho.config.materia ?? '—' }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-surface-500 dark:text-surface-400">
                            Ano
                        </dt>
                        <dd class="text-surface-900 dark:text-surface-0">
                            {{
                                rascunho.config.ano
                                    ? `${rascunho.config.ano}º ano`
                                    : '—'
                            }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-surface-500 dark:text-surface-400">
                            Questões
                        </dt>
                        <dd class="text-surface-900 dark:text-surface-0">
                            {{ rascunho.config.quantidade ?? '—' }}
                        </dd>
                    </div>
                    <div>
                        <dt class="text-surface-500 dark:text-surface-400">
                            Passo atual
                        </dt>
                        <dd class="text-surface-900 dark:text-surface-0">
                            {{ rascunho.passoAtual }} de 4
                        </dd>
                    </div>
                </dl>

                <div class="flex gap-2">
                    <Button
                        label="Retomar"
                        icon="pi pi-play"
                        :href="route('prova.criar')"
                        :as="Link"
                    />
                    <Button
                        label="Nova prova"
                        icon="pi pi-refresh"
                        severity="secondary"
                        @click="confirmarNovaProva"
                    />
                </div>
            </div>

            <div v-else class="flex flex-col items-start gap-3">
                <p class="text-surface-600 dark:text-surface-300 text-sm">
                    Nenhuma prova em andamento.
                </p>
                <Button
                    label="Criar prova"
                    icon="pi pi-file-edit"
                    :href="route('prova.criar')"
                    :as="Link"
                />
            </div>
        </template>
    </Card>
</template>
