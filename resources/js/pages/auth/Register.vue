<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Password from 'primevue/password';
import { route } from 'ziggy-js';

const form = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
});

function submit() {
    form.post(route('register.store'), {
        onFinish: () => form.reset('password', 'password_confirmation'),
    });
}
</script>

<template>
    <Head title="Cadastro" />

    <Card>
        <template #title>Criar conta</template>
        <template #subtitle>Preencha os dados para começar</template>
        <template #content>
            <form class="flex flex-col gap-4" @submit.prevent="submit">
                <div class="flex flex-col gap-1">
                    <label for="name" class="text-sm font-medium">Nome</label>
                    <InputText
                        id="name"
                        v-model="form.name"
                        autocomplete="name"
                        autofocus
                        :invalid="!!form.errors.name"
                        fluid
                    />
                    <Message
                        v-if="form.errors.name"
                        severity="error"
                        variant="simple"
                        size="small"
                    >
                        {{ form.errors.name }}
                    </Message>
                </div>

                <div class="flex flex-col gap-1">
                    <label for="email" class="text-sm font-medium"
                        >E-mail</label
                    >
                    <InputText
                        id="email"
                        v-model="form.email"
                        type="email"
                        autocomplete="email"
                        :invalid="!!form.errors.email"
                        fluid
                    />
                    <Message
                        v-if="form.errors.email"
                        severity="error"
                        variant="simple"
                        size="small"
                    >
                        {{ form.errors.email }}
                    </Message>
                </div>

                <div class="flex flex-col gap-1">
                    <label for="password" class="text-sm font-medium"
                        >Senha</label
                    >
                    <Password
                        input-id="password"
                        v-model="form.password"
                        toggle-mask
                        :feedback="false"
                        autocomplete="new-password"
                        :invalid="!!form.errors.password"
                        fluid
                    />
                    <Message
                        v-if="form.errors.password"
                        severity="error"
                        variant="simple"
                        size="small"
                    >
                        {{ form.errors.password }}
                    </Message>
                </div>

                <div class="flex flex-col gap-1">
                    <label
                        for="password_confirmation"
                        class="text-sm font-medium"
                    >
                        Confirmar senha
                    </label>
                    <Password
                        input-id="password_confirmation"
                        v-model="form.password_confirmation"
                        toggle-mask
                        :feedback="false"
                        autocomplete="new-password"
                        fluid
                    />
                </div>

                <Button
                    type="submit"
                    label="Cadastrar"
                    :loading="form.processing"
                    fluid
                />

                <p class="text-surface-500 text-center text-sm">
                    Já tem conta?
                    <Link
                        :href="route('login')"
                        class="text-primary font-medium"
                    >
                        Entrar
                    </Link>
                </p>
            </form>
        </template>
    </Card>
</template>
