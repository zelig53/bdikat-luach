import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifestFilename: 'manifest.json',
        manifest: {
          name: 'ספירה לאחור לחופשת לידה',
          short_name: 'חופשת לידה',
          description: 'אפליקציית ספירה לאחור מרגשת לחופשת לידה',
          theme_color: '#fff5f7',
          background_color: '#fff5f7',
          display: 'standalone',
          orientation: 'portrait',
          dir: 'rtl',
          lang: 'he',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'https://picsum.photos/seed/baby/192/192',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://picsum.photos/seed/baby/512/512',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'https://picsum.photos/seed/baby/512/512',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
