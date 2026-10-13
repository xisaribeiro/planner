// Gera os ícones do app (um "P" em Playfair itálico sobre lilás) com o Chromium do Playwright.
// Uso: npm run icones
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const fonte = readFileSync('src/fonts/playfair-display-latin-400-italic.woff2').toString('base64');
const LILAS = '#CBC3E3';
const TINTA = '#3B3834';

const modelos = [
  // nome, tamanho, arredondamento (% do lado), tamanho do P (% do lado), transparente nos cantos
  ['icon-192.png', 192, 22, 66, true],
  ['icon-512.png', 512, 22, 66, true],
  ['icon-maskable-512.png', 512, 0, 46, false],
  ['apple-touch-icon.png', 180, 0, 62, false],
  ['favicon-32.png', 32, 22, 70, true],
];

function pagina(tamanho, arredondamento, p) {
  return `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'PF';font-style:italic;font-weight:400;src:url(data:font/woff2;base64,${fonte}) format('woff2')}
html,body{margin:0;background:transparent}
.i{width:${tamanho}px;height:${tamanho}px;background:${LILAS};border-radius:${arredondamento}%;display:grid;place-items:center;overflow:hidden}
.i span{font-family:'PF',serif;font-style:italic;font-size:${Math.round((tamanho * p) / 100)}px;line-height:1;color:${TINTA};transform:translate(-2%, -4%)}
</style><div class="i"><span>P</span></div>`;
}

mkdirSync('public/icons', { recursive: true });
const navegador = await chromium.launch();
for (const [nome, tamanho, arred, p, transparente] of modelos) {
  const aba = await navegador.newPage({ viewport: { width: tamanho, height: tamanho }, deviceScaleFactor: 1 });
  await aba.setContent(pagina(tamanho, arred, p));
  await aba.evaluate(() => document.fonts.ready);
  await aba.screenshot({ path: `public/icons/${nome}`, omitBackground: transparente, clip: { x: 0, y: 0, width: tamanho, height: tamanho } });
  await aba.close();
  console.log('gerado', nome);
}
await navegador.close();
