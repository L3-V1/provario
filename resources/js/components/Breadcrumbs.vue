<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { House } from '@lucide/vue';
import Breadcrumb from 'primevue/breadcrumb';
import type { MenuItem } from 'primevue/menuitem';
import { computed } from 'vue';
import { route } from 'ziggy-js';
import type { BreadcrumbItem } from '@/types';

const props = defineProps<{ items?: BreadcrumbItem[] }>();

const home = computed<MenuItem>(() => ({ url: route('dashboard') }));

const model = computed<MenuItem[]>(() =>
    (props.items ?? []).map((item) => ({
        label: item.label,
        url: item.href,
    })),
);

function navigate(event: MouseEvent, url?: string) {
    if (!url) return;
    event.preventDefault();
    router.visit(url);
}
</script>

<template>
    <Breadcrumb :home="home" :model="model" class="bg-transparent! p-0!">
        <template #item="{ item }">
            <a
                :href="item.url"
                class="text-surface-500 hover:text-surface-800 dark:hover:text-surface-100 flex items-center gap-1 text-sm"
                @click="navigate($event, item.url)"
            >
                <House v-if="!item.label" class="size-4" />
                <span v-else>{{ item.label }}</span>
            </a>
        </template>
    </Breadcrumb>
</template>
