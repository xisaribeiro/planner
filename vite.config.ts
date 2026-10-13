/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Lê os cabeçalhos de public/_headers (bloco "/*") para o preview usar a mesma CSP da hospedagem. */
function cabecalhosGlobais(): Record<string, string> {
  const out: Record<string, string> = {};
  let dentro = false;
  for (const linha of readFileSync('public/_headers', 'utf8').split('\n')) {
    if (/^\S/.test(linha)) {
      dentro = linha.trim() === '/*';
      continue;
    }
    const m = dentro ? linha.match(/^\s+([A-Za-z-]+):\s*(.+)$/) : null;
    if (m?.[1] && m[2]) out[m[1]] = m[2].trim();
  }
  return out;
}

export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: false },
  preview: { headers: cabecalhosGlobais() },
  plugins: [
    VitePWA({
      // Sem pop-ups: a versão nova espera e assume na próxima abertura do app.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'tema-inicial.js'],
      manifest: {
        name: 'Planner',
        short_name: 'Planner',
        description: 'O planner pessoal da Isabelle.',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#F4F1EB',
        background_color: '#F4F1EB',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest,json}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
