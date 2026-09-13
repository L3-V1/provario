<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { computed } from 'vue';
import { route } from 'ziggy-js';
import type { PerfilResumo } from '@/types/prova';

const props = defineProps<{ perfis?: PerfilResumo[] }>();

const lista = computed(() => props.perfis ?? []);
</script>

<template>
    <Card class="w-full">
        <template #title>🏫 Perfis institucionais</template>

        <template #content>
            <div
                v-if="lista.length === 0"
                class="flex flex-col items-center gap-3 py-6 text-center"
            >
                <span aria-hidden="true" class="text-3xl">📭</span>
                <p class="text-surface-600 dark:text-surface-300 text-sm">
                    Você ainda não cadastrou nenhum perfil institucional.
                </p>
                <Button
                    label="Criar primeiro perfil"
                    icon="pi pi-plus"
                    :href="route('perfis.create')"
                    :as="Link"
                    size="small"
                />
            </div>

            <div v-else class="flex flex-col gap-3">
                <ul class="flex flex-col gap-2">
                    <li
                        v-for="perfil in lista"
                        :key="perfil.id"
                        class="border-surface-200 dark:border-surface-700 flex items-center gap-3 rounded-md border p-2"
                    >
                        <img
                            v-if="perfil.logo_url"
                            :src="perfil.logo_url"
                            alt="Logo"
                            class="size-8 shrink-0 rounded object-contain"
                        />
                        <span
                            v-else
                            class="pi pi-image text-surface-400 shrink-0 text-lg"
                        />
                        <div class="min-w-0">
                            <p
                                class="text-surface-900 dark:text-surface-0 truncate text-sm font-medium"
                            >
                                {{ perfil.instituicao }}
                            </p>
                            <p
                                class="text-surface-600 dark:text-surface-300 truncate text-xs"
                            >
                                {{ perfil.escola }}
                            </p>
                        </div>
                    </li>
                </ul>

                <Link
                    :href="route('perfis.index')"
                    class="text-primary-600 dark:text-primary-400 text-sm hover:underline"
                >
                    Gerenciar perfis
                </Link>
            </div>
        </template>
    </Card>
</template>
