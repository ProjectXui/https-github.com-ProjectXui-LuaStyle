
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Essencial para deploy no GitHub Pages (username.github.io/repo-name/)
  build: {
    outDir: 'dist',
  },
  define: {
    // Permite que o processo de build injete a chave de API se disponível
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
