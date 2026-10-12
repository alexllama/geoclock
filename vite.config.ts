import { defineConfig } from 'vite';

// GitHub Pages project site: https://alexllama.github.io/geoclock/
export default defineConfig({
  base: '/geoclock/',
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1500
  }
});
