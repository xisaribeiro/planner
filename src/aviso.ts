/** Aviso curto (toast) por cerca de 2,5 segundos. Lido por leitores de tela via aria-live. */
let elemento: HTMLElement | null = null;
let relogio: ReturnType<typeof setTimeout> | undefined;

export function mostrarAviso(texto: string): void {
  if (!elemento) {
    elemento = document.createElement('div');
    elemento.className = 'toast';
    elemento.setAttribute('role', 'status');
    elemento.setAttribute('aria-live', 'polite');
    document.body.appendChild(elemento);
  }
  elemento.textContent = texto;
  elemento.hidden = false;
  clearTimeout(relogio);
  relogio = setTimeout(() => {
    if (elemento) elemento.hidden = true;
  }, 2500);
}
