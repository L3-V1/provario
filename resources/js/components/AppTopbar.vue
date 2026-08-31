<script setup lang="ts">
import { Menu as MenuIcon } from '@lucide/vue';
import Button from 'primevue/button';
import AppLogo from '@/components/AppLogo.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import UserMenu from '@/components/UserMenu.vue';

defineEmits<{ 'toggle-sidebar': [] }>();
</script>

<template>
    <header
        class="border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900 sticky top-0 z-20 flex h-16 items-center gap-2 border-b px-4"
    >
        <Button
            type="button"
            severity="secondary"
            text
            rounded
            class="lg:hidden"
            aria-label="Abrir menu"
            @click="$emit('toggle-sidebar')"
        >
            <template #icon>
                <MenuIcon class="size-5" />
            </template>
        </Button>

        <div class="lg:hidden">
            <AppLogo />
        </div>

        <div class="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
        </div>
    </header>
</template>
