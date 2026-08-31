<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog';
import Drawer from 'primevue/drawer';
import { ref } from 'vue';
import AppSidebar from '@/components/AppSidebar.vue';
import AppTopbar from '@/components/AppTopbar.vue';
import FlashToasts from '@/components/FlashToasts.vue';

const mobileSidebarOpen = ref(false);
</script>

<template>
    <div class="bg-surface-50 dark:bg-surface-950 min-h-screen lg:flex">
        <!-- Sidebar fixa (>= lg) -->
        <aside
            class="border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900 hidden w-64 shrink-0 border-r lg:block"
        >
            <div class="sticky top-0 h-screen">
                <AppSidebar />
            </div>
        </aside>

        <!-- Sidebar em drawer (< lg) -->
        <Drawer
            v-model:visible="mobileSidebarOpen"
            class="w-72!"
            :pt="{ header: { class: 'hidden' } }"
        >
            <AppSidebar @navigate="mobileSidebarOpen = false" />
        </Drawer>

        <div class="flex min-w-0 flex-1 flex-col">
            <AppTopbar @toggle-sidebar="mobileSidebarOpen = true" />

            <main class="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
                <slot />
            </main>
        </div>
    </div>

    <FlashToasts />
    <ConfirmDialog :style="{ width: '36rem' }" />
</template>
