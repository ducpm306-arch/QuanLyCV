import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: frontendRoot,
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/cvs': 'http://localhost:8000',
      '/positions': 'http://localhost:8000',
      '/tech-stacks': 'http://localhost:8000',
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
});
