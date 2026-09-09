<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import AtalhosRapidos from '@/components/painel/AtalhosRapidos.vue';
import CardRascunho from '@/components/painel/CardRascunho.vue';
import GuiaFluxo from '@/components/painel/GuiaFluxo.vue';
import ResumoPerfis from '@/components/painel/ResumoPerfis.vue';
import PageHeader from '@/components/PageHeader.vue';
import type { User } from '@/types';
import type { PerfilResumo } from '@/types/prova';

defineProps<{ perfis?: PerfilResumo[] }>();

const user = computed(() => usePage().props.auth.user as User | null);
</script>

<template>
    <Head title="Dashboard" />

    <div class="space-y-4">
        <PageHeader
            title="Dashboard"
            :subtitle="`Bem-vindo(a), ${user?.name ?? ''}`"
            :breadcrumbs="[{ label: 'Dashboard' }]"
        />

        <div class="grid gap-4 md:grid-cols-2">
            <CardRascunho />
            <AtalhosRapidos />
            <ResumoPerfis :perfis="perfis" />
            <GuiaFluxo />
        </div>
    </div>
</template>
