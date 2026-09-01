<script setup lang="ts">
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { ANOS, MATERIAS, type ConfigProva } from '@/types/prova';

const config = defineModel<ConfigProva>({ required: true });

const materias = MATERIAS.map((m) => ({ label: m, value: m }));
const anos = ANOS.map((a) => ({ label: `${a}º ano`, value: a }));
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
            <label for="materia" class="text-sm font-medium">Matéria</label>
            <Select
                id="materia"
                v-model="config.materia"
                :options="materias"
                option-label="label"
                option-value="value"
                placeholder="Selecione a matéria"
                fluid
            />
        </div>

        <div class="flex flex-col gap-1">
            <label for="ano" class="text-sm font-medium">Ano</label>
            <Select
                id="ano"
                v-model="config.ano"
                :options="anos"
                option-label="label"
                option-value="value"
                placeholder="Selecione o ano"
                fluid
            />
        </div>

        <div class="flex flex-col gap-1">
            <label for="conteudo" class="text-sm font-medium">
                Conteúdo didático
            </label>
            <InputText
                id="conteudo"
                v-model="config.conteudo"
                placeholder="Ex.: Genética, Reprodução, Ciclo da Água"
                fluid
            />
        </div>

        <div class="flex flex-col gap-1">
            <label for="quantidade" class="text-sm font-medium">
                Quantidade de questões
            </label>
            <InputNumber
                id="quantidade"
                v-model="config.quantidade"
                :min="1"
                :max="30"
                show-buttons
                fluid
            />
        </div>
    </div>
</template>
