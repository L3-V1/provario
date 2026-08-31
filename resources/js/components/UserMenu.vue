<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3';
import { LogOut, UserRound } from '@lucide/vue';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';
import { computed, markRaw, ref } from 'vue';
import { route } from 'ziggy-js';
import type { User } from '@/types';

const user = computed(() => usePage().props.auth.user as User | null);

const initials = computed(() => {
    const name = user.value?.name?.trim() ?? '';
    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length === 0) return '?';

    return (parts[0][0] + (parts.at(-1)?.[0] ?? '')).toUpperCase();
});

const menu = ref<InstanceType<typeof Menu>>();

const icons = markRaw({ profile: UserRound, logout: LogOut });

const items = computed<MenuItem[]>(() => [
    {
        key: 'profile',
        label: 'Perfil',
        command: () => router.visit(route('profile.edit')),
    },
    { separator: true },
    {
        key: 'logout',
        label: 'Sair',
        command: () => router.post(route('logout')),
    },
]);
</script>

<template>
    <Button
        type="button"
        severity="secondary"
        text
        rounded
        aria-haspopup="true"
        aria-label="Menu do usuário"
        @click="menu?.toggle($event)"
    >
        <template #icon>
            <Avatar :label="initials" shape="circle" size="normal" />
        </template>
    </Button>

    <Menu ref="menu" :model="items" :popup="true">
        <template #start>
            <div
                class="border-surface-200 dark:border-surface-700 border-b px-3 py-2"
            >
                <p class="truncate text-sm font-medium">{{ user?.name }}</p>
                <p class="text-surface-500 truncate text-xs">
                    {{ user?.email }}
                </p>
            </div>
        </template>
        <template #item="{ item, props }">
            <a v-bind="props.action" class="flex items-center gap-2">
                <component
                    :is="icons[item.key as 'profile' | 'logout']"
                    class="size-4"
                />
                <span>{{ item.label }}</span>
            </a>
        </template>
    </Menu>
</template>
