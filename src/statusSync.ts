/** Ponto discreto ao lado do botão de tema com o estado da sincronização. Tocar nele diz o estado em palavras. */
import { mostrarAviso } from './aviso';
import { textos } from './strings';
import type { EstadoDeSync, Sincronizador } from './sync';

const TEXTO: Record<EstadoDeSync, string> = {
  sincronizado: textos.sync.sincronizado,
  sincronizando: textos.sync.sincronizando,
  aguardando: textos.sync.aguardando,
  offline: textos.sync.offline,
  'sem-sessao': textos.sync.semSessao,
  erro: textos.sync.erro,
};

export function criarStatusDeSync(sinc: Sincronizador): HTMLButtonElement {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'sync';
  const ponto = document.createElement('i');
  ponto.setAttribute('aria-hidden', 'true');
  botao.appendChild(ponto);

  const pintar = (e: EstadoDeSync) => {
    botao.dataset['estado'] = e;
    botao.setAttribute('aria-label', `${textos.sync.rotulo}: ${TEXTO[e]}`);
    botao.title = TEXTO[e];
  };
  pintar(sinc.estado);
  sinc.aoMudarEstado(pintar);
  botao.addEventListener('click', () => mostrarAviso(TEXTO[sinc.estado]));
  return botao;
}
