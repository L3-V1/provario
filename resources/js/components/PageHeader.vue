<script setup lang="ts">
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import type { BreadcrumbItem } from '@/types';

defineProps<{
    title: string;
    subtitle?: string;
    /** Emoji decorativo do contexto da página, exibido antes do título. */
    emoji?: string;
    breadcrumbs?: BreadcrumbItem[];
}>();
</script>

<template>
    <div class="space-y-2">
        <Breadcrumbs v-if="breadcrumbs?.length" :items="breadcrumbs" />

        <div class="flex items-start justify-between gap-4">
            <div class="space-y-1">
                <h1
                    class="text-surface-900 dark:text-surface-0 flex items-center gap-2 text-2xl font-semibold"
                >
                    <span v-if="emoji" aria-hidden="true">{{ emoji }}</span>
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
