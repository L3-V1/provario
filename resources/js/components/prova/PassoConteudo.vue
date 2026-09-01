<script setup lang="ts">
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { computed, watch } from 'vue';
import type {
    CabecalhoProva,
    LayoutColunas,
    PerfilResumo,
} from '@/types/prova';

const props = defineProps<{ perfis: PerfilResumo[]; materia: string | null }>();

const markdown = defineModel<string>('markdown', { required: true });
const cabecalho = defineModel<CabecalhoProva>('cabecalho', { required: true });
const layout = defineModel<LayoutColunas>('layout', { required: true });

const opcoesPerfil = computed(() => [
    { label: 'Nenhum', value: null },
    ...props.perfis.map((p) => ({
        label: `${p.instituicao} — ${p.escola}`,
        value: p.id,
    })),
]);

const opcoesLayout = [
    { label: '1 coluna', value: 1 },
    { label: '2 colunas', value: 2 },
];

function aplicarPerfil(id: number | null) {
    cabecalho.value.perfil_id = id;

    const perfil = props.perfis.find((p) => p.id === id) ?? null;

    if (perfil) {
        cabecalho.value.instituicao = perfil.instituicao;
        cabecalho.value.escola = perfil.escola;
        cabecalho.value.professor = perfil.professor;
        cabecalho.value.logo_url = perfil.logo_url;
    } else {
        cabecalho.value.logo_url = null;
    }
}

// disciplina segue a matéria do Passo 1 enquanto o professor não a editar
watch(
    () => props.materia,
    (materia) => {
        if (materia && !cabecalho.value.disciplina) {
            cabecalho.value.disciplina = materia;
        }
    },
    { immediate: true },
);
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-1">
            <label for="markdown" class="text-sm font-medium">
                Markdown da I.A.
            </label>
            <Textarea
                id="markdown"
                v-model="markdown"
                rows="12"
                class="font-mono text-sm"
                placeholder="Cole aqui o markdown gerado pela I.A."
                fluid
            />
        </div>

        <div class="flex flex-col gap-4">
            <span class="text-sm font-semibold">Cabeçalho da prova</span>

            <div class="flex flex-col gap-1">
                <label for="perfil" class="text-sm font-medium">
                    Usar perfil institucional
                </label>
                <Select
                    id="perfil"
                    :model-value="cabecalho.perfil_id"
                    :options="opcoesPerfil"
                    option-label="label"
                    option-value="value"
                    fluid
                    @update:model-value="aplicarPerfil"
                />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-1">
                    <label for="c-instituicao" class="text-sm font-medium">
                        Instituição
                    </label>
                    <InputText
                        id="c-instituicao"
                        v-model="cabecalho.instituicao"
                        fluid
                    />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="c-escola" class="text-sm font-medium">
                        Escola
                    </label>
                    <InputText id="c-escola" v-model="cabecalho.escola" fluid />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="c-disciplina" class="text-sm font-medium">
                        Disciplina
                    </label>
                    <InputText
                        id="c-disciplina"
                        v-model="cabecalho.disciplina"
                        fluid
                    />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="c-professor" class="text-sm font-medium">
                        Professor
                    </label>
                    <InputText
                        id="c-professor"
                        v-model="cabecalho.professor"
                        fluid
                    />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="c-titulo" class="text-sm font-medium">
                        Título da prova
                    </label>
                    <InputText id="c-titulo" v-model="cabecalho.titulo" fluid />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="c-bimestre" class="text-sm font-medium">
                        Bimestre / período
                    </label>
                    <InputText
                        id="c-bimestre"
                        v-model="cabecalho.bimestre"
                        fluid
                    />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="c-valor" class="text-sm font-medium">
                        Valor total
                    </label>
                    <InputText
                        id="c-valor"
                        v-model="cabecalho.valor_total"
                        fluid
                    />
                </div>
            </div>

            <div class="flex flex-col gap-1">
                <span class="text-sm font-medium">Layout de impressão</span>
                <SelectButton
                    v-model="layout"
                    :options="opcoesLayout"
                    option-label="label"
                    option-value="value"
                    :allow-empty="false"
                />
            </div>
        </div>
    </div>
</template>
