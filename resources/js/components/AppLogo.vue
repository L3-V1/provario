<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { Boxes } from '@lucide/vue';
import { computed } from 'vue';

const name = computed(
    () => (usePage().props.name as string | undefined) ?? 'Laravel',
);
</script>

<template>
    <span class="flex items-center gap-2 font-semibold">
        <span
            class="bg-primary text-primary-contrast flex size-8 items-center justify-center rounded-md"
        >
            <Boxes class="size-5" />
        </span>
        <span class="truncate">{{ name }}</span>
    </span>
</template>
