import { expect, test } from '@playwright/test';

test.describe('sem login', () => {
  test('mostra só a tela de entrada, com o botão do Google e sem as abas', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planner');
    await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Abas' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('sem internet o botão explica em vez de tentar entrar', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Entrar com Google' }).click();
    await expect(page.getByRole('alert')).toContainText('Sem internet');
    await context.setOffline(false);
  });

  test('conta recusada volta para a tela de entrada com a explicação', async ({ page }) => {
    await page.goto('/?error=server_error&error_description=Este+planner+%C3%A9+de+uso+pessoal.');
    await expect(page.getByRole('alert')).toContainText('não tem acesso');
    await expect(page).not.toHaveURL(/error=/);
  });
});

test.describe('com login', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('e2e-usuario', '1'));
  });

  test('o ponto de sincronização diz o estado em palavras', async ({ page }) => {
    await page.goto('/');
    const ponto = page.getByRole('button', { name: /Estado da sincronização/ });
    await expect(ponto).toHaveAttribute('data-estado', 'offline');
    await expect(ponto).toHaveAttribute('aria-label', /Sem internet/);
    await ponto.click();
    await expect(page.getByRole('status')).toContainText('Sem internet');
  });

  test('o banco local guarda e devolve dados sem rede', async ({ page }) => {
    await page.goto('/');
    const resultado = await page.evaluate(async () => {
      const abrir = () =>
        new Promise<IDBDatabase>((ok, erro) => {
          const r = indexedDB.open('planner');
          r.onsuccess = () => ok(r.result);
          r.onerror = () => erro(r.error);
        });
      const bd = await abrir();
      return [...bd.objectStoreNames].sort();
    });
    expect(resultado).toContain('todos');
    expect(resultado).toContain('fila');
    expect(resultado).toContain('meta');
    expect(resultado).toHaveLength(20);
  });
});
