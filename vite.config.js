import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            // Upstream aliases
            '@app': path.resolve(__dirname, './src/app'),
            '@features': path.resolve(__dirname, './src/features'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@shared': path.resolve(__dirname, './src/shared'),
            '@layouts': path.resolve(__dirname, './src/layouts'),
            // Stashed aliases (for compatibility with new Planter components)
            '@': path.resolve(__dirname, './src'),
            'utils': path.resolve(__dirname, './src/utils'),
            'lib': path.resolve(__dirname, './src/lib'),
            'api': path.resolve(__dirname, './src/api'),
            'entities': path.resolve(__dirname, './src/entities'),
            'hooks': path.resolve(__dirname, './src/hooks'),
            'services': path.resolve(__dirname, './src/services'),
            'contexts': path.resolve(__dirname, './src/contexts'),
            'styles': path.resolve(__dirname, './src/styles'),
        },
    },
    build: {
        outDir: 'build',
    },
    server: {
        open: true,
        port: 3000,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.js',
    },
});
