<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { LayoutGrid, UserRound } from '@lucide/vue';
import { computed } from 'vue';
import { route } from 'ziggy-js';
import AppLogo from '@/components/AppLogo.vue';
import type { NavItem } from '@/types';

defineEmits<{ navigate: [] }>();

const page = usePage();

const items = computed<NavItem[]>(() => {
    // Reactive dependency: Inertia updates page.url on every SPA visit,
    // forcing route().current() below to be re-evaluated.
    void page.url;

    return [
        {
            label: 'Dashboard',
            href: route('dashboard'),
            icon: LayoutGrid,
            active: route().current('dashboard'),
        },
        {
            label: 'Perfil',
            href: route('profile.edit'),
            icon: UserRound,
            active: route().current('profile.*'),
        },
    ];
});
</script>

<template>
    <div class="flex h-full flex-col gap-4 p-4">
        <Link :href="route('dashboard')" class="px-2 py-1">
            <AppLogo />
        </Link>

        <nav class="flex flex-col gap-1">
            <Link
                v-for="item in items"
                :key="item.href"
                :href="item.href"
                class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                :class="
                    item.active
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                "
                @click="$emit('navigate')"
            >
                <component :is="item.icon" class="size-4" />
                {{ item.label }}
            </Link>
        </nav>
    </div>
</template>
