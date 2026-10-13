/** Tema claro e escuro. Segue o sistema até ela escolher, e a escolha fica em localStorage (pl-theme). */
const CHAVE = 'pl-theme';

const SOL =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>';
const LUA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>';

const raiz = document.documentElement;

export function temaEscuro(): boolean {
  const escolhido = raiz.dataset['theme'];
  if (escolhido) return escolhido === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Mantém a cor da barra do navegador igual ao fundo do tema. */
function atualizarCorDaBarra(): void {
  const cor = getComputedStyle(raiz).getPropertyValue('--bg').trim();
  if (cor) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cor);
}

/** Ícone de sol quando está escuro e de lua quando está claro. */
export function ligarBotaoDeTema(botao: HTMLButtonElement): void {
  const pintar = () => {
    botao.innerHTML = temaEscuro() ? SOL : LUA;
    atualizarCorDaBarra();
  };
  botao.addEventListener('click', () => {
    const novo = temaEscuro() ? 'light' : 'dark';
    raiz.dataset['theme'] = novo;
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      /* sem armazenamento, o tema vale só nesta abertura */
    }
    pintar();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', pintar);
  pintar();
}
