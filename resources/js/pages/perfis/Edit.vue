<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { route } from 'ziggy-js';
import PageHeader from '@/components/PageHeader.vue';
import PerfilForm, { type PerfilFormData } from '@/components/PerfilForm.vue';
import type { Perfil } from '@/types';

const props = defineProps<{ perfil: Perfil }>();

const form = useForm<PerfilFormData>({
    instituicao: props.perfil.instituicao,
    escola: props.perfil.escola,
    professor: props.perfil.professor,
    logo: null,
    remover_logo: false,
});

function submit() {
    form.transform((data) => ({ ...data, _method: 'put' })).post(
        route('perfis.update', props.perfil.id),
        { forceFormData: true },
    );
}
</script>

<template>
    <Head title="Editar perfil institucional" />

    <div class="space-y-4">
        <PageHeader
            title="Editar perfil institucional"
            emoji="✏️"
            :breadcrumbs="[
                { label: 'Perfis institucionais', href: route('perfis.index') },
                { label: 'Editar perfil' },
            ]"
        />

        <PerfilForm :perfil="perfil" :form="form" @submit="submit" />
    </div>
</template>
