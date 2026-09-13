import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { fontsource } from 'laravel-vite-plugin/fonts';
import { defineConfig, lazyPlugins } from 'vite-plus';

export default defineConfig({
    plugins: lazyPlugins(() => [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.ts'],
            refresh: true,
            fonts: [
                // Inter: texto corrido. Sora: títulos (`--font-display`).
                // Preload apenas os pesos usados na primeira pintura; os demais
                // carregam sob demanda (display: swap). Evita os avisos
                // "preloaded ... was not used" do Firefox no dev server.
                fontsource('Inter', {
                    package: '@fontsource/inter',
                    weights: [400, 500, 600],
                    preload: [{ weight: 400 }, { weight: 600 }],
                }),
                fontsource('Sora', {
                    package: '@fontsource/sora',
                    weights: [600, 700],
                    preload: [{ weight: 600 }],
                }),
            ],
        }),
        tailwindcss(),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
    ]),
    server: {
        watch: {
            ignored: [
                '**/.agents/**',
                '**/.claude/**',
                '**/.cursor/**',
                '**/.junie/**',
                '**/vendor/**',
            ],
        },
    },
    lint: {
        ignorePatterns: [
            'vendor/**',
            'node_modules/**',
            'public/**',
            'bootstrap/ssr/**',
        ],
        options: {
            denyWarnings: true,
            typeAware: true,
        },
    },
    fmt: {
        printWidth: 80,
        tabWidth: 4,
        singleQuote: true,
        semi: true,
        singleAttributePerLine: false,
        htmlWhitespaceSensitivity: 'css',
        ignorePatterns: [
            '.github/**',
            'composer.json',
            'resources/views/mail/*',
        ],
        sortTailwindcss: {
            functions: ['clsx', 'cn', 'cva'],
            entryPoint: 'resources/css/app.css',
        },
    },
});
