<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3';
import Card from 'primevue/card';
import { computed } from 'vue';
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import type { User } from '@/types';

const user = computed(() => usePage().props.auth.user as User | null);
</script>

<template>
    <Head title="Dashboard" />

    <div class="space-y-4">
        <Breadcrumbs :items="[{ label: 'Dashboard' }]" />

        <Card class="w-full">
            <template #title>Bem-vindo(a), {{ user?.name }}</template>
            <template #content>
                <p class="text-surface-500">
                    Este é o ponto de partida do painel. Use o menu lateral para
                    navegar.
                </p>
            </template>
        </Card>
    </div>
</template>
