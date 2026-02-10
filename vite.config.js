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
      '@entities': path.resolve(__dirname, './src/entities'),
      '@widgets': path.resolve(__dirname, './src/widgets'),
      // Stashed aliases (for compatibility with new Planter components)
      '@': path.resolve(__dirname, './src'),
      styles: path.resolve(__dirname, './src/styles'),
    },
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (/@radix-ui/.test(id)) return 'ui';
          if (/recharts/.test(id)) return 'charts';
          if (/framer-motion/.test(id)) return 'motion';
          if (/@supabase/.test(id)) return 'supabase';
          if (/lucide/.test(id)) return 'icons';

          const match = id.match(/node_modules\/([^/]+)/);
          return match ? `vendor-${match[1].replace('@', '')}` : 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    open: true,
    port: 3000,
    host: '127.0.0.1',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e'],
  },
});
