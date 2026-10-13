import { defineConfig, devices } from '@playwright/test';

/** Roda o app construído em modo de testes (sem Google) e com a CSP real da hospedagem em 390, 820 e 1280 pixels, claro e escuro. */
const larguras = [
  { nome: 'celular-390', width: 390, height: 844 },
  { nome: 'tablet-820', width: 820, height: 1180 },
  { nome: 'notebook-1280', width: 1280, height: 800 },
] as const;

const temas = ['light', 'dark'] as const;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build:e2e && npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
  projects: larguras.flatMap((l) =>
    temas.map((tema) => ({
      name: `${l.nome}-${tema}`,
      use: { ...devices['Desktop Chrome'], viewport: { width: l.width, height: l.height }, colorScheme: tema },
    })),
  ),
});
