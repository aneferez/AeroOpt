import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Standalone test config. It deliberately avoids the app's Vite config, which
// loads the Cloudflare/Vinext/Sites plugins that are irrelevant (and slow) for
// unit tests. The `@/` alias mirrors tsconfig so imports resolve identically.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    css: false,
  },
});
