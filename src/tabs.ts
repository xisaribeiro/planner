/** Cada aba desenha sua tela dentro do <main>. Nesta fase as abas ainda são cascas, sem nenhum conteúdo. */
import type { Contexto } from './contexto';
import type { Destino, Rota } from './router';
import { textos } from './strings';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texto?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function casca(rota: Rota, destino: HTMLElement): void {
  const t = textos.abas[rota];
  const titulo = el('h1', 'pagina-titulo', t.titulo);
  if (t.complemento) titulo.appendChild(el('em', undefined, t.complemento));
  destino.append(titulo, el('p', 'pagina-aviso', textos.provisorio));
}

const telas: Record<Rota, (destino: HTMLElement, d: Destino, ctx: Contexto) => void> = {
  hoje: (el_) => casca('hoje', el_),
  faculdade: (el_) => casca('faculdade', el_),
  metas: (el_) => casca('metas', el_),
  wishlist: (el_) => casca('wishlist', el_),
  repertorio: (el_) => casca('repertorio', el_),
  cursos: (el_) => casca('cursos', el_),
};

export function desenharAba(destino: Destino, principal: HTMLElement, ctx: Contexto): void {
  principal.replaceChildren();
  principal.dataset['rota'] = destino.rota;
  telas[destino.rota](principal, destino, ctx);
}
