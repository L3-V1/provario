import { createInertiaApp } from '@inertiajs/vue3';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import type { DefineComponent } from 'vue';
import { createApp, h } from 'vue';
import { ZiggyVue } from 'ziggy-js';
import { initializeTheme } from '@/composables/useAppearance';
import AppLayout from '@/layouts/AppLayout.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import { primeVuePtBr } from '@/lib/primevue-ptbr';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Botões `severity="secondary"` no tema light: o Aura stock resolve o fundo
// para {surface.100}, contraste fraco demais sobre {surface.0}. Sobe um degrau.
// Ver docs/knowledge/botao-secondary-tema-light.md
const AppPreset = definePreset(Aura, {
    components: {
        button: {
            colorScheme: {
                light: {
                    root: {
                        secondary: {
                            background: '{surface.200}',
                            hoverBackground: '{surface.300}',
                            activeBackground: '{surface.400}',
                            borderColor: '{surface.200}',
                            hoverBorderColor: '{surface.300}',
                            activeBorderColor: '{surface.400}',
                        },
                    },
                },
            },
        },
    },
});

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name): Promise<DefineComponent> =>
        resolvePageComponent<{ default: { layout?: unknown } }>(
            `./pages/${name}.vue`,
            import.meta.glob<{ default: { layout?: unknown } }>(
                './pages/**/*.vue',
            ),
        ).then((page) => {
            page.default.layout ??= name.startsWith('auth/')
                ? AuthLayout
                : AppLayout;

            return page as unknown as DefineComponent;
        }),
    setup({ el, App, props, plugin }) {
        createApp({ render: () => h(App, props) })
            .use(plugin)
            .use(ZiggyVue)
            .use(PrimeVue, {
                theme: {
                    preset: AppPreset,
                    options: {
                        darkModeSelector: '.dark',
                        cssLayer: {
                            name: 'primevue',
                            order: 'theme, base, primevue, components, utilities',
                        },
                    },
                },
                locale: primeVuePtBr,
            })
            .use(ToastService)
            .use(ConfirmationService)
            .mount(el);
    },
    progress: {
        color: 'var(--p-primary-color)',
    },
});

initializeTheme();
