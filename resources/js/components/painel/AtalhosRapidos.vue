<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { route } from 'ziggy-js';

const atalhos = [
    { label: 'Criar prova', emoji: '📝', href: route('prova.criar') },
    { label: 'Novo perfil', emoji: '➕', href: route('perfis.create') },
    {
        label: 'Gerenciar perfis',
        emoji: '🏫',
        href: route('perfis.index'),
    },
];
</script>

<template>
    <Card class="w-full">
        <template #title>⚡ Atalhos rápidos</template>

        <template #content>
            <div class="flex flex-col gap-2">
                <Button
                    v-for="atalho in atalhos"
                    :key="atalho.label"
                    :href="atalho.href"
                    :as="Link"
                    severity="secondary"
                    class="justify-start"
                >
                    <span aria-hidden="true" class="text-base">{{
                        atalho.emoji
                    }}</span>
                    {{ atalho.label }}
                </Button>
            </div>
        </template>
    </Card>
</template>
