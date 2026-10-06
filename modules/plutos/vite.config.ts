import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

// Versão do Talos: arquivo VERSION na raiz do repositório (ex.: "1.1")
const versao = fs.readFileSync(path.resolve(__dirname, '../../VERSION'), 'utf8').trim();

export default defineConfig(() => {
  return {
    base: '/talos/plutos/',
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(versao),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
