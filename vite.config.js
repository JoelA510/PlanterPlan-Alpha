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
      styles: path.resolve(__dirname, './src/styles'),
    },
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@radix-ui')) return 'ui';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('lucide')) return 'icons';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
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
