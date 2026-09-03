<script setup lang="ts">
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import type { BreadcrumbItem } from '@/types';

defineProps<{
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
}>();
</script>

<template>
    <div class="space-y-2">
        <Breadcrumbs v-if="breadcrumbs?.length" :items="breadcrumbs" />

        <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
                <h1
                    class="text-surface-900 dark:text-surface-0 text-2xl font-semibold"
                >
                    {{ title }}
                </h1>
                <p v-if="subtitle" class="text-surface-500 text-sm">
                    {{ subtitle }}
                </p>
            </div>

            <div v-if="$slots.actions" class="shrink-0">
                <slot name="actions" />
            </div>
        </div>
    </div>
</template>
