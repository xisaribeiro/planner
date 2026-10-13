import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';

import { registerSW } from 'virtual:pwa-register';
import { aoMudarDestino, lerDestino, ROTAS, type Rota } from './router';
import { desenharAba } from './tabs';
import { ligarBotaoDeTema } from './theme';
import { textos } from './strings';

function montarCasca(raiz: HTMLElement): { principal: HTMLElement; links: Map<Rota, HTMLAnchorElement> } {
  const pular = document.createElement('a');
  pular.className = 'skip';
  pular.href = '#conteudo';
  pular.textContent = textos.app.pularParaConteudo;
  // O link leva ao <main>, sem mexer no hash de roteamento.
  pular.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('conteudo')?.focus();
  });

  const app = document.createElement('div');
  app.className = 'app';

  const nav = document.createElement('nav');
  nav.className = 'rail';
  nav.setAttribute('aria-label', textos.app.abas);

  const abas = document.createElement('div');
  abas.className = 'tabs';
  const links = new Map<Rota, HTMLAnchorElement>();
  for (const rota of ROTAS) {
    const a = document.createElement('a');
    a.className = 'tab';
    a.href = `#${rota}`;
    a.textContent = textos.abas[rota].rotulo;
    abas.appendChild(a);
    links.set(rota, a);
  }

  const fim = document.createElement('div');
  fim.className = 'rail-fim';
  const tema = document.createElement('button');
  tema.type = 'button';
  tema.className = 'theme';
  tema.setAttribute('aria-label', textos.tema.alternar);
  fim.appendChild(tema);
  ligarBotaoDeTema(tema);

  nav.append(abas, fim);

  const principal = document.createElement('main');
  principal.className = 'main';
  principal.id = 'conteudo';
  principal.tabIndex = -1;

  app.append(nav, principal);
  raiz.append(pular, app);
  return { principal, links };
}

function iniciar(): void {
  const raiz = document.getElementById('app');
  if (!raiz) return;
  const { principal, links } = montarCasca(raiz);

  let primeira = true;
  const mostrar = () => {
    const destino = lerDestino();
    // Só a aba aberta leva aria-current.
    for (const [rota, a] of links) {
      if (rota === destino.rota) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    desenharAba(destino, principal);
    if (!primeira) {
      principal.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
    primeira = false;
  };
  aoMudarDestino(mostrar);
  mostrar();

  // Versão nova assume na próxima abertura, em silêncio.
  registerSW();
  // Pede ao navegador para não limpar os dados do app.
  void navigator.storage?.persist?.();
}

iniciar();
