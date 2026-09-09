<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { route } from 'ziggy-js';

const atalhos = [
    {
        label: 'Criar prova',
        icon: 'pi pi-file-edit',
        href: route('prova.criar'),
    },
    { label: 'Novo perfil', icon: 'pi pi-plus', href: route('perfis.create') },
    {
        label: 'Gerenciar perfis',
        icon: 'pi pi-building',
        href: route('perfis.index'),
    },
];
</script>

<template>
    <Card class="w-full">
        <template #title>Atalhos rápidos</template>

        <template #content>
            <div class="flex flex-col gap-2">
                <Button
                    v-for="atalho in atalhos"
                    :key="atalho.label"
                    :label="atalho.label"
                    :icon="atalho.icon"
                    :href="atalho.href"
                    :as="Link"
                    severity="secondary"
                    class="justify-start"
                />
            </div>
        </template>
    </Card>
</template>
