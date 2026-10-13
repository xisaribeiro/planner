/** Uma tela por aba, com roteamento por hash: #hoje, #faculdade, #metas, #wishlist, #repertorio, #cursos. */
export const ROTAS = ['hoje', 'faculdade', 'metas', 'wishlist', 'repertorio', 'cursos'] as const;
export type Rota = (typeof ROTAS)[number];

export const ROTA_INICIAL: Rota = 'hoje';

export interface Destino {
  rota: Rota;
  /** Parte depois da barra, por exemplo #metas/ano. */
  sub: string;
}

export function lerDestino(hash: string = location.hash): Destino {
  const [primeiro = '', ...resto] = hash.replace(/^#\/?/, '').split('/');
  const rota = (ROTAS as readonly string[]).includes(primeiro) ? (primeiro as Rota) : ROTA_INICIAL;
  return { rota, sub: resto.join('/') };
}

export function aoMudarDestino(ouvinte: (d: Destino) => void): void {
  window.addEventListener('hashchange', () => ouvinte(lerDestino()));
}
