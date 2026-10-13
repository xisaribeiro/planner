/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
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

/** No build, coloca a mesma CSP no HTML, para hospedagens que não leem public/_headers (como o GitHub Pages). */
function cspNoHtml(): Plugin {
  return {
    name: 'csp-no-html',
    apply: 'build',
    transformIndexHtml() {
      const csp = cabecalhosGlobais()['Content-Security-Policy'];
      if (!csp) return [];
      // frame-ancestors só vale em cabeçalho HTTP, não em <meta>.
      const valor = csp.split(';').map((d) => d.trim()).filter((d) => d && !d.startsWith('frame-ancestors')).join('; ');
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: valor }, injectTo: 'head-prepend' }];
    },
  };
}

export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: false },
  preview: { headers: cabecalhosGlobais() },
  plugins: [
    cspNoHtml(),
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
