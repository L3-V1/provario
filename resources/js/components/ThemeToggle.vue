<script setup lang="ts">
import { Monitor, Moon, Sun } from '@lucide/vue';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';
import { computed, markRaw, ref } from 'vue';
import { useAppearance } from '@/composables/useAppearance';
import type { Appearance } from '@/types';

const { appearance, updateAppearance } = useAppearance();

const menu = ref<InstanceType<typeof Menu>>();

const icons = markRaw({ light: Sun, dark: Moon, system: Monitor });

const currentIcon = computed(() => icons[appearance.value]);

const labels: Record<Appearance, string> = {
    light: 'Claro',
    dark: 'Escuro',
    system: 'Sistema',
};

const items = computed<MenuItem[]>(() =>
    (Object.keys(labels) as Appearance[]).map((value) => ({
        label: labels[value],
        value,
        class: appearance.value === value ? 'font-semibold' : undefined,
        command: () => updateAppearance(value),
    })),
);
</script>

<template>
    <Button
        type="button"
        severity="secondary"
        text
        rounded
        aria-haspopup="true"
        aria-label="Alternar tema"
        @click="menu?.toggle($event)"
    >
        <template #icon>
            <component :is="currentIcon" class="size-5" />
        </template>
    </Button>

    <Menu ref="menu" :model="items" :popup="true">
        <template #item="{ item, props }">
            <a v-bind="props.action" class="flex items-center gap-2">
                <component
                    :is="icons[item.value as Appearance]"
                    class="size-4"
                />
                <span>{{ item.label }}</span>
            </a>
        </template>
    </Menu>
</template>
