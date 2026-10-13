/** Tela de entrada: uma tela só, no estilo do app, com o botão "Entrar com Google". */
import { entrarComGoogle } from './auth';
import { textos } from './strings';

export function mostrarTelaDeLogin(raiz: HTMLElement, motivo: 'normal' | 'recusada' | 'erro'): void {
  raiz.replaceChildren();
  const principal = document.createElement('main');
  principal.className = 'login';
  principal.id = 'conteudo';

  const titulo = document.createElement('h1');
  titulo.textContent = textos.login.titulo;
  const texto = document.createElement('p');
  texto.className = 'login-texto';
  texto.textContent = textos.login.texto;

  const aviso = document.createElement('p');
  aviso.className = 'login-aviso';
  aviso.setAttribute('role', 'alert');
  if (motivo === 'recusada') aviso.textContent = textos.login.recusada;
  else if (motivo === 'erro') aviso.textContent = textos.login.erro;

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'btn login-botao';
  botao.textContent = textos.login.botao;
  botao.addEventListener('click', async () => {
    aviso.textContent = '';
    if (!navigator.onLine) {
      aviso.textContent = textos.login.semInternet;
      return;
    }
    botao.disabled = true;
    botao.textContent = textos.login.entrando;
    const ok = await entrarComGoogle();
    if (!ok) {
      botao.disabled = false;
      botao.textContent = textos.login.botao;
      aviso.textContent = textos.login.erro;
    }
  });

  principal.append(titulo, texto, botao, aviso);
  raiz.appendChild(principal);
}
