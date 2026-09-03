<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { useConfirm } from 'primevue/useconfirm';
import { route } from 'ziggy-js';
import PageHeader from '@/components/PageHeader.vue';
import type { Perfil } from '@/types';

defineProps<{ perfis: Perfil[] }>();

const confirm = useConfirm();

function confirmarExclusao(perfil: Perfil) {
    confirm.require({
        header: 'Excluir perfil',
        message: `Deseja excluir o perfil de "${perfil.instituicao}"? Esta ação não pode ser desfeita.`,
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancelar',
        acceptLabel: 'Excluir',
        acceptClass: 'p-button-danger',
        accept: () => router.delete(route('perfis.destroy', perfil.id)),
    });
}
</script>

<template>
    <Head title="Perfis institucionais" />

    <div class="space-y-4">
        <PageHeader
            title="Perfis institucionais"
            :breadcrumbs="[{ label: 'Perfis institucionais' }]"
        >
            <template #actions>
                <Button
                    label="Novo perfil"
                    icon="pi pi-plus"
                    :href="route('perfis.create')"
                    :as="Link"
                />
            </template>
        </PageHeader>

        <DataTable :value="perfis" data-key="id">
            <template #empty>
                <div
                    class="text-surface-500 flex flex-col items-center justify-center gap-2 py-10"
                >
                    <i class="pi pi-inbox text-2xl" />
                    <span>Nenhum perfil cadastrado.</span>
                </div>
            </template>

            <Column header="Logo" style="width: 4rem">
                <template #body="{ data }">
                    <img
                        v-if="(data as Perfil).logo_url"
                        :src="(data as Perfil).logo_url!"
                        alt="Logo"
                        class="size-10 rounded object-contain"
                    />
                    <span v-else class="pi pi-image text-surface-400 text-xl" />
                </template>
            </Column>

            <Column field="instituicao" header="Instituição" />
            <Column field="escola" header="Escola" />
            <Column field="professor" header="Professor" />

            <Column header="Ações" style="width: 8rem">
                <template #body="{ data }">
                    <div class="flex gap-1">
                        <Button
                            icon="pi pi-pencil"
                            severity="secondary"
                            variant="text"
                            :href="route('perfis.edit', (data as Perfil).id)"
                            :as="Link"
                        />
                        <Button
                            icon="pi pi-trash"
                            severity="danger"
                            variant="text"
                            @click="confirmarExclusao(data as Perfil)"
                        />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>
