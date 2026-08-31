<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Password from 'primevue/password';
import { route } from 'ziggy-js';

const form = useForm({
    email: '',
    password: '',
    remember: false,
});

function submit() {
    form.post(route('login.store'), {
        onFinish: () => form.reset('password'),
    });
}
</script>

<template>
    <Head title="Entrar" />

    <Card>
        <template #title>Entrar</template>
        <template #subtitle>Acesse sua conta para continuar</template>
        <template #content>
            <form class="flex flex-col gap-4" @submit.prevent="submit">
                <div class="flex flex-col gap-1">
                    <label for="email" class="text-sm font-medium"
                        >E-mail</label
                    >
                    <InputText
                        id="email"
                        v-model="form.email"
                        type="email"
                        autocomplete="email"
                        autofocus
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
                        :feedback="false"
                        toggle-mask
                        autocomplete="current-password"
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

                <div class="flex items-center gap-2">
                    <Checkbox
                        input-id="remember"
                        v-model="form.remember"
                        :binary="true"
                    />
                    <label for="remember" class="text-sm">Lembrar de mim</label>
                </div>

                <Button
                    type="submit"
                    label="Entrar"
                    :loading="form.processing"
                    fluid
                />

                <p class="text-surface-500 text-center text-sm">
                    Não tem conta?
                    <Link
                        :href="route('register')"
                        class="text-primary font-medium"
                    >
                        Cadastre-se
                    </Link>
                </p>
            </form>
        </template>
    </Card>
</template>
