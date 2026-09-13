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

/**
 * Gradiente vertical sutil para o fundo dos botões cheios.
 *
 * O token `button.<severity>.background` do Aura é aplicado à propriedade CSS
 * `background` (shorthand), e o motor de tema resolve referências `{token.path}`
 * dentro da string — então um gradiente é um valor de token válido. O relevo
 * (sombra interna no topo) fica no CSS, em `app.css`: o Aura só expõe token de
 * sombra para a variante `raised`.
 *
 * `de` é o topo (mais claro) e `ate` a base (mais escuro), mantendo o tom médio
 * igual à cor sólida que o Aura usaria — o botão ganha profundidade sem mudar de
 * cor percebida.
 */
const relevo = (de: string, ate: string): string =>
    `linear-gradient(180deg, ${de} 0%, ${ate} 100%)`;

/**
 * Constrói os três estados de fundo de uma severidade a partir de uma escala de
 * cor. Os índices seguem os do Aura stock: no light o repouso centra no 500, no
 * dark no 400 (a escala é invertida — hover clareia).
 */
const severidadeClara = (c: string) => ({
    background: relevo(`{${c}.400}`, `{${c}.600}`),
    hoverBackground: relevo(`{${c}.500}`, `{${c}.700}`),
    activeBackground: relevo(`{${c}.600}`, `{${c}.800}`),
    borderColor: `{${c}.600}`,
    hoverBorderColor: `{${c}.700}`,
    activeBorderColor: `{${c}.800}`,
});

const severidadeEscura = (c: string) => ({
    background: relevo(`{${c}.300}`, `{${c}.500}`),
    hoverBackground: relevo(`{${c}.200}`, `{${c}.400}`),
    activeBackground: relevo(`{${c}.100}`, `{${c}.300}`),
    borderColor: `{${c}.500}`,
    hoverBorderColor: `{${c}.400}`,
    activeBorderColor: `{${c}.300}`,
});

const AppPreset = definePreset(Aura, {
    primitive: {
        // Cantos mais arredondados: um degrau acima do Aura stock (2/4/6/8/12px),
        // para um visual mais acolhedor. `lg` espelha `--radius` em app.css.
        borderRadius: {
            none: '0',
            xs: '4px',
            sm: '6px',
            md: '8px',
            lg: '12px',
            xl: '16px',
        },
    },
    semantic: {
        // O verde de marca. Já era o default do Aura (emerald), mas herdado
        // silenciosamente — declarar aqui dá um ponto único de edição da cor.
        primary: {
            50: '{emerald.50}',
            100: '{emerald.100}',
            200: '{emerald.200}',
            300: '{emerald.300}',
            400: '{emerald.400}',
            500: '{emerald.500}',
            600: '{emerald.600}',
            700: '{emerald.700}',
            800: '{emerald.800}',
            900: '{emerald.900}',
            950: '{emerald.950}',
        },
    },
    components: {
        button: {
            colorScheme: {
                light: {
                    root: {
                        primary: severidadeClara('primary'),
                        // Cinza: o Aura stock resolve o fundo para {surface.100},
                        // contraste fraco demais sobre {surface.0}. O gradiente
                        // centra no {surface.200}, preservando a correção.
                        // Ver docs/knowledge/botao-secondary-tema-light.md
                        secondary: {
                            background: relevo(
                                '{surface.100}',
                                '{surface.300}',
                            ),
                            hoverBackground: relevo(
                                '{surface.200}',
                                '{surface.400}',
                            ),
                            activeBackground: relevo(
                                '{surface.300}',
                                '{surface.400}',
                            ),
                            borderColor: '{surface.300}',
                            hoverBorderColor: '{surface.400}',
                            activeBorderColor: '{surface.400}',
                        },
                        success: severidadeClara('green'),
                        info: severidadeClara('sky'),
                        warn: severidadeClara('orange'),
                        help: severidadeClara('purple'),
                        danger: severidadeClara('red'),
                    },
                },
                dark: {
                    root: {
                        primary: severidadeEscura('primary'),
                        secondary: {
                            background: relevo(
                                '{surface.700}',
                                '{surface.800}',
                            ),
                            hoverBackground: relevo(
                                '{surface.600}',
                                '{surface.700}',
                            ),
                            activeBackground: relevo(
                                '{surface.500}',
                                '{surface.600}',
                            ),
                            borderColor: '{surface.800}',
                            hoverBorderColor: '{surface.700}',
                            activeBorderColor: '{surface.600}',
                        },
                        success: severidadeEscura('green'),
                        info: severidadeEscura('sky'),
                        warn: severidadeEscura('orange'),
                        help: severidadeEscura('purple'),
                        danger: severidadeEscura('red'),
                    },
                },
            },
        },
        // O raio do card já segue `{border.radius.xl}`, que subiu junto com a
        // escala acima. Só a sombra é nova: até aqui o projeto não usava
        // nenhuma, e ela é o que dá o leve relevo aos cards.
        card: {
            colorScheme: {
                light: {
                    root: {
                        shadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
                    },
                },
                dark: {
                    root: {
                        shadow: '0 1px 2px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.25)',
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
