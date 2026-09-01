<script setup lang="ts">
import { Link, type InertiaForm } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { route } from 'ziggy-js';
import LogoDropzone from '@/components/LogoDropzone.vue';
import type { Perfil } from '@/types';

export type PerfilFormData = {
    instituicao: string;
    escola: string;
    professor: string;
    logo: File | null;
    remover_logo: boolean;
};

const props = defineProps<{
    perfil?: Perfil;
    form: InertiaForm<PerfilFormData>;
}>();

const emit = defineEmits<{ submit: [] }>();

function definirLogo(arquivo: File | null) {
    props.form.logo = arquivo;
    props.form.remover_logo = false;
}

function removerLogoAtual() {
    props.form.remover_logo = true;
    props.form.logo = null;
}
</script>

<template>
    <Card class="w-full">
        <template #content>
            <form class="flex flex-col gap-4" @submit.prevent="emit('submit')">
                <div class="flex flex-col gap-1">
                    <label for="instituicao" class="text-sm font-medium">
                        Instituição
                    </label>
                    <InputText
                        id="instituicao"
                        v-model="form.instituicao"
                        :invalid="!!form.errors.instituicao"
                        fluid
                    />
                    <Message
                        v-if="form.errors.instituicao"
                        severity="error"
                        variant="simple"
                        size="small"
                    >
                        {{ form.errors.instituicao }}
                    </Message>
                </div>

                <div class="flex flex-col gap-1">
                    <label for="escola" class="text-sm font-medium">
                        Escola
                    </label>
                    <InputText
                        id="escola"
                        v-model="form.escola"
                        :invalid="!!form.errors.escola"
                        fluid
                    />
                    <Message
                        v-if="form.errors.escola"
                        severity="error"
                        variant="simple"
                        size="small"
                    >
                        {{ form.errors.escola }}
                    </Message>
                </div>

                <div class="flex flex-col gap-1">
                    <label for="professor" class="text-sm font-medium">
                        Professor
                    </label>
                    <InputText
                        id="professor"
                        v-model="form.professor"
                        :invalid="!!form.errors.professor"
                        fluid
                    />
                    <Message
                        v-if="form.errors.professor"
                        severity="error"
                        variant="simple"
                        size="small"
                    >
                        {{ form.errors.professor }}
                    </Message>
                </div>

                <div class="flex flex-col gap-2">
                    <span class="text-sm font-medium">Logo</span>

                    <LogoDropzone
                        :model-value="form.logo"
                        :logo-atual-url="perfil?.logo_url ?? null"
                        :removida="form.remover_logo"
                        :invalid="!!form.errors.logo"
                        @update:model-value="definirLogo"
                        @remover="removerLogoAtual"
                    />
                    <Message
                        v-if="form.errors.logo"
                        severity="error"
                        variant="simple"
                        size="small"
                    >
                        {{ form.errors.logo }}
                    </Message>
                </div>

                <div class="flex gap-2">
                    <Button
                        type="submit"
                        label="Salvar"
                        icon="pi pi-save"
                        :loading="form.processing"
                    />
                    <Button
                        type="button"
                        label="Cancelar"
                        severity="secondary"
                        variant="outlined"
                        :href="route('perfis.index')"
                        :as="Link"
                    />
                </div>
            </form>
        </template>
    </Card>
</template>
