import { expect, test } from '@playwright/test';

const ABAS = ['Hoje', 'Faculdade', 'Metas', 'Wishlist', 'Repertório', 'Cursos'];
const HASH = ['hoje', 'faculdade', 'metas', 'wishlist', 'repertorio', 'cursos'];

test('seis abas na ordem certa e só uma com aria-current', async ({ page }) => {
  await page.goto('/');
  const abas = page.getByRole('navigation', { name: 'Abas' }).getByRole('link');
  await expect(abas).toHaveText(ABAS);
  await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page');
});

test('trocar de aba muda o hash, o título e o aria-current', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < ABAS.length; i++) {
    await page.getByRole('link', { name: ABAS[i]!, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${HASH[i]}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText(ABAS[i]!);
    await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('[aria-current="page"]')).toHaveText(ABAS[i]!);
  }
});

test('abre direto na aba do hash e cai em Hoje quando o hash é desconhecido', async ({ page }) => {
  await page.goto('/#cursos');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cursos');
  await page.goto('/#nada-disso');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hoje');
});

test('sem rolagem horizontal em nenhuma aba', async ({ page }) => {
  await page.goto('/');
  for (const h of HASH) {
    await page.goto(`/#${h}`);
    const { rolagem, janela } = await page.evaluate(() => ({
      rolagem: document.documentElement.scrollWidth,
      janela: document.documentElement.clientWidth,
    }));
    expect(rolagem, `aba ${h}`).toBeLessThanOrEqual(janela);
  }
});

test('o menu muda de forma no celular e no computador', async ({ page }) => {
  await page.goto('/');
  const largura = await page.evaluate(() => document.querySelector('nav')!.getBoundingClientRect().width);
  const viewport = page.viewportSize()!.width;
  if (viewport <= 820) expect(Math.round(largura)).toBe(50);
  else expect(Math.round(largura)).toBe(168);
});

test('alvos de toque de pelo menos 40px no celular', async ({ page }) => {
  await page.goto('/');
  test.skip(page.viewportSize()!.width > 820, 'regra do celular');
  const caixas = await page.locator('.tab, .theme').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { w: r.width, h: r.height };
    }),
  );
  for (const c of caixas) {
    expect(c.w).toBeGreaterThanOrEqual(39.5);
    expect(c.h).toBeGreaterThanOrEqual(39.5);
  }
});

test('o tema segue o sistema e o botão alterna e lembra a escolha', async ({ page }, info) => {
  await page.goto('/');
  const escuroDoSistema = info.project.name.endsWith('dark');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await expect.poll(bg).toBe(escuroDoSistema ? 'rgb(31, 30, 28)' : 'rgb(244, 241, 235)');

  await page.getByRole('button', { name: 'Alternar modo claro e escuro' }).click();
  await expect.poll(bg).toBe(escuroDoSistema ? 'rgb(244, 241, 235)' : 'rgb(31, 30, 28)');
  expect(await page.evaluate(() => localStorage.getItem('pl-theme'))).toBe(escuroDoSistema ? 'light' : 'dark');

  await page.reload();
  await expect.poll(bg).toBe(escuroDoSistema ? 'rgb(244, 241, 235)' : 'rgb(31, 30, 28)');
});

test('as fontes são as locais', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const familias = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
  expect(familias.join(',')).toContain('Playfair Display');
  expect(familias.join(',')).toContain('Quicksand');
});

test('o manifesto é instalável e tem ícones', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const resposta = await request.get(new URL(href!, page.url()).toString());
  const m = await resposta.json();
  expect(m.name).toBe('Planner');
  expect(m.lang).toBe('pt-BR');
  expect(m.display).toBe('standalone');
  expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

test('abre e navega com a rede cortada depois da primeira visita', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Deixa o service worker assumir esta página antes de cortar a rede.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.goto('/#wishlist');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wishlist');
  await page.getByRole('link', { name: 'Cursos' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cursos');
  await page.evaluate(() => document.fonts.ready);
  const familias = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
  expect(familias.join(',')).toContain('Quicksand');
  await context.setOffline(false);
});

test('a página não faz pedidos para fora do próprio site', async ({ page }) => {
  const externos: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.origin !== 'http://127.0.0.1:4173' && !u.protocol.startsWith('data')) externos.push(r.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(externos).toEqual([]);
});
