<script setup lang="ts">
import FlashToasts from '@/components/FlashToasts.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import AppLogo from '@/components/AppLogo.vue';
</script>

<template>
    <div
        class="bg-surface-50 dark:bg-surface-950 flex min-h-screen flex-col items-center justify-center p-4"
    >
        <div class="absolute top-4 right-4">
            <ThemeToggle />
        </div>

        <div class="mb-6">
            <AppLogo />
        </div>

        <div class="w-full max-w-sm">
            <slot />
        </div>
    </div>

    <FlashToasts />
</template>
