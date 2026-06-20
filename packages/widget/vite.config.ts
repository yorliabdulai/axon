import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/widget.ts',
      name: 'AxonWidget',
      fileName: 'widget',
      formats: ['iife'],
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
