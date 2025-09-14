import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  build: {
    sourcemap: true,
    target: 'esnext'
  },
  define: {
    // Phaser references process.env in some places
    'process.env': {}
  }
});


