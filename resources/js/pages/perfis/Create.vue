<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { route } from 'ziggy-js';
import PageHeader from '@/components/PageHeader.vue';
import PerfilForm, { type PerfilFormData } from '@/components/PerfilForm.vue';

const form = useForm<PerfilFormData>({
    instituicao: '',
    escola: '',
    professor: '',
    logo: null,
    remover_logo: false,
});

function submit() {
    form.post(route('perfis.store'), { forceFormData: true });
}
</script>

<template>
    <Head title="Novo perfil institucional" />

    <div class="space-y-4">
        <PageHeader
            title="Novo perfil institucional"
            :breadcrumbs="[
                { label: 'Perfis institucionais', href: route('perfis.index') },
                { label: 'Novo perfil' },
            ]"
        />

        <PerfilForm :form="form" @submit="submit" />
    </div>
</template>
