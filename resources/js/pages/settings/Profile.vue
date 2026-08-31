<script setup lang="ts">
import { Head, useForm, usePage } from '@inertiajs/vue3';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Password from 'primevue/password';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import { useConfirm } from 'primevue/useconfirm';
import { computed } from 'vue';
import { route } from 'ziggy-js';
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import type { User } from '@/types';

const user = computed(() => usePage().props.auth.user as User);
const confirm = useConfirm();

const profileForm = useForm({
    name: user.value.name,
    email: user.value.email,
});

const passwordForm = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
});

const deleteForm = useForm({
    password: '',
});

function updateProfile() {
    profileForm.patch(route('profile.update'), { preserveScroll: true });
}

function updatePassword() {
    passwordForm.put(route('profile.password.update'), {
        preserveScroll: true,
        onSuccess: () => passwordForm.reset(),
        onError: () => passwordForm.reset('password', 'password_confirmation'),
    });
}

function confirmDelete() {
    confirm.require({
        header: 'Excluir conta',
        message:
            'Esta ação é permanente e removerá todos os seus dados. Deseja continuar?',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancelar',
        acceptLabel: 'Excluir',
        acceptClass: 'p-button-danger',
        accept: () =>
            deleteForm.delete(route('profile.destroy'), {
                preserveScroll: true,
            }),
    });
}
</script>

<template>
    <Head title="Perfil" />

    <div class="space-y-4">
        <Breadcrumbs
            :items="[{ label: 'Configurações' }, { label: 'Perfil' }]"
        />

        <Tabs value="dados">
            <TabList>
                <Tab value="dados">Dados</Tab>
                <Tab value="senha">Senha</Tab>
                <Tab value="excluir">Excluir conta</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="dados">
                    <Card class="w-full">
                        <template #title>Dados cadastrais</template>
                        <template #content>
                            <form
                                class="flex flex-col gap-4"
                                @submit.prevent="updateProfile"
                            >
                                <div class="grid gap-4 sm:grid-cols-2">
                                    <div class="flex flex-col gap-1">
                                        <label
                                            for="name"
                                            class="text-sm font-medium"
                                        >
                                            Nome
                                        </label>
                                        <InputText
                                            id="name"
                                            v-model="profileForm.name"
                                            :invalid="!!profileForm.errors.name"
                                            fluid
                                        />
                                        <Message
                                            v-if="profileForm.errors.name"
                                            severity="error"
                                            variant="simple"
                                            size="small"
                                        >
                                            {{ profileForm.errors.name }}
                                        </Message>
                                    </div>

                                    <div class="flex flex-col gap-1">
                                        <label
                                            for="email"
                                            class="text-sm font-medium"
                                        >
                                            E-mail
                                        </label>
                                        <InputText
                                            id="email"
                                            v-model="profileForm.email"
                                            type="email"
                                            :invalid="
                                                !!profileForm.errors.email
                                            "
                                            fluid
                                        />
                                        <Message
                                            v-if="profileForm.errors.email"
                                            severity="error"
                                            variant="simple"
                                            size="small"
                                        >
                                            {{ profileForm.errors.email }}
                                        </Message>
                                    </div>
                                </div>

                                <div>
                                    <Button
                                        type="submit"
                                        label="Salvar"
                                        icon="pi pi-save"
                                        :loading="profileForm.processing"
                                    />
                                </div>
                            </form>
                        </template>
                    </Card>
                </TabPanel>

                <TabPanel value="senha">
                    <Card class="w-full">
                        <template #title>Alterar senha</template>
                        <template #content>
                            <form
                                class="flex flex-col gap-4"
                                @submit.prevent="updatePassword"
                            >
                                <div class="flex flex-col gap-1">
                                    <label
                                        for="current_password"
                                        class="text-sm font-medium"
                                    >
                                        Senha atual
                                    </label>
                                    <Password
                                        input-id="current_password"
                                        v-model="passwordForm.current_password"
                                        :feedback="false"
                                        toggle-mask
                                        autocomplete="current-password"
                                        :invalid="
                                            !!passwordForm.errors
                                                .current_password
                                        "
                                        fluid
                                    />
                                    <Message
                                        v-if="
                                            passwordForm.errors.current_password
                                        "
                                        severity="error"
                                        variant="simple"
                                        size="small"
                                    >
                                        {{
                                            passwordForm.errors.current_password
                                        }}
                                    </Message>
                                </div>

                                <div class="flex flex-col gap-1">
                                    <label
                                        for="new_password"
                                        class="text-sm font-medium"
                                    >
                                        Nova senha
                                    </label>
                                    <Password
                                        input-id="new_password"
                                        v-model="passwordForm.password"
                                        toggle-mask
                                        autocomplete="new-password"
                                        :invalid="
                                            !!passwordForm.errors.password
                                        "
                                        fluid
                                    />
                                    <Message
                                        v-if="passwordForm.errors.password"
                                        severity="error"
                                        variant="simple"
                                        size="small"
                                    >
                                        {{ passwordForm.errors.password }}
                                    </Message>
                                </div>

                                <div class="flex flex-col gap-1">
                                    <label
                                        for="password_confirmation"
                                        class="text-sm font-medium"
                                    >
                                        Confirmar nova senha
                                    </label>
                                    <Password
                                        input-id="password_confirmation"
                                        v-model="
                                            passwordForm.password_confirmation
                                        "
                                        :feedback="false"
                                        toggle-mask
                                        autocomplete="new-password"
                                        fluid
                                    />
                                </div>

                                <div>
                                    <Button
                                        type="submit"
                                        label="Atualizar senha"
                                        icon="pi pi-key"
                                        :loading="passwordForm.processing"
                                    />
                                </div>
                            </form>
                        </template>
                    </Card>
                </TabPanel>

                <TabPanel value="excluir">
                    <Card class="w-full">
                        <template #title>Excluir conta</template>
                        <template #content>
                            <form
                                class="flex flex-col gap-4"
                                @submit.prevent="confirmDelete"
                            >
                                <Message severity="warn" variant="simple">
                                    Ao excluir sua conta, todos os dados serão
                                    removidos permanentemente.
                                </Message>

                                <div class="flex flex-col gap-1">
                                    <label
                                        for="delete_password"
                                        class="text-sm font-medium"
                                    >
                                        Confirme sua senha
                                    </label>
                                    <Password
                                        input-id="delete_password"
                                        v-model="deleteForm.password"
                                        :feedback="false"
                                        toggle-mask
                                        autocomplete="current-password"
                                        :invalid="!!deleteForm.errors.password"
                                        fluid
                                    />
                                    <Message
                                        v-if="deleteForm.errors.password"
                                        severity="error"
                                        variant="simple"
                                        size="small"
                                    >
                                        {{ deleteForm.errors.password }}
                                    </Message>
                                </div>

                                <div>
                                    <Button
                                        type="submit"
                                        label="Excluir minha conta"
                                        icon="pi pi-trash"
                                        severity="danger"
                                        :loading="deleteForm.processing"
                                    />
                                </div>
                            </form>
                        </template>
                    </Card>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>
