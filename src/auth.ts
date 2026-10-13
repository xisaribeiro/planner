/**
 * Login só com Google, só da conta da Isabelle. Depois do primeiro login a sessão fica guardada
 * e o app abre direto, mesmo sem internet (o aparelho lembra quem é o dono dos dados).
 */
import { createClient, type Session } from '@supabase/supabase-js';
import { EMAIL_PERMITIDO, ESCOPO_AGENDA, SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from './config';
import type { BancoLocal } from './db';

declare const __E2E__: boolean;

export const supabase = createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
  auth: {
    // PKCE devolve o código na query (?code=), sem mexer no # que o roteador usa.
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type ResultadoDoLogin =
  | { tipo: 'entrou'; usuarioId: string; email: string; comSessao: boolean }
  | { tipo: 'precisa-entrar'; motivo: 'normal' | 'recusada' | 'erro' };

interface Dono {
  id: string;
  email: string;
}

const META_DONO = 'usuario';
const META_TOKEN_ENVIADO = 'gcal:tokenEnviado';
const TOKEN_PENDENTE = 'pl-gcal-token-pendente';
const ID_DE_TESTE = '00000000-0000-4000-8000-000000000e2e';

function comLimite<T>(promessa: Promise<T>, ms: number): Promise<T | 'tempo'> {
  return Promise.race([promessa, new Promise<'tempo'>((resolver) => setTimeout(() => resolver('tempo'), ms))]);
}

function limparParametrosDoRetorno(): void {
  const url = new URL(location.href);
  let mudou = false;
  for (const p of ['code', 'error', 'error_code', 'error_description']) {
    if (url.searchParams.has(p)) {
      url.searchParams.delete(p);
      mudou = true;
    }
  }
  if (mudou) history.replaceState(null, '', url.pathname + url.search + url.hash);
}

/** Guarda o token que o Google entrega só no momento do login, para a leitura da agenda funcionar depois. */
async function guardarTokenDoGoogle(banco: BancoLocal, token: string): Promise<void> {
  const impressao = token.slice(-12);
  if ((await banco.lerMeta<string>(META_TOKEN_ENVIADO)) === impressao) return;
  try {
    sessionStorage.setItem(TOKEN_PENDENTE, token);
  } catch {
    /* sem armazenamento, só tenta uma vez */
  }
  const { error } = await supabase.functions.invoke('gcal', { body: { acao: 'salvar', refresh_token: token } });
  if (error) return; // fica pendente, a próxima abertura tenta de novo
  await banco.gravarMeta(META_TOKEN_ENVIADO, impressao);
  try {
    sessionStorage.removeItem(TOKEN_PENDENTE);
  } catch {
    /* nada a limpar */
  }
}

async function aceitarSessao(banco: BancoLocal, sessao: Session): Promise<ResultadoDoLogin> {
  const email = (sessao.user.email ?? '').toLowerCase();
  if (email !== EMAIL_PERMITIDO) {
    await supabase.auth.signOut();
    return { tipo: 'precisa-entrar', motivo: 'recusada' };
  }
  const dono: Dono = { id: sessao.user.id, email };
  await banco.gravarMeta(META_DONO, dono);
  banco.usuarioId = dono.id;
  const token = sessao.provider_refresh_token ?? sessionStorage.getItem(TOKEN_PENDENTE);
  if (token) void guardarTokenDoGoogle(banco, token);
  return { tipo: 'entrou', usuarioId: dono.id, email, comSessao: true };
}

export async function iniciarLogin(banco: BancoLocal): Promise<ResultadoDoLogin> {
  // Nos testes automáticos (build "e2e"), um marcador no aparelho simula a conta, sem Google.
  if (__E2E__ && localStorage.getItem('e2e-usuario')) {
    banco.usuarioId = ID_DE_TESTE;
    return { tipo: 'entrou', usuarioId: ID_DE_TESTE, email: EMAIL_PERMITIDO, comSessao: false };
  }

  const params = new URLSearchParams(location.search);
  if (params.has('error')) {
    const descricao = params.get('error_description') ?? '';
    limparParametrosDoRetorno();
    return { tipo: 'precisa-entrar', motivo: /planner|database error|pessoal/i.test(descricao) ? 'recusada' : 'erro' };
  }

  const leitura = await comLimite(supabase.auth.getSession(), 4000);
  limparParametrosDoRetorno();
  if (leitura !== 'tempo' && leitura.data.session) return aceitarSessao(banco, leitura.data.session);

  // Sem sessão utilizável. Se este aparelho já conhece a dona e não há internet, abre com os dados locais.
  const dono = await banco.lerMeta<Dono>(META_DONO);
  if (dono && (leitura === 'tempo' || !navigator.onLine)) {
    banco.usuarioId = dono.id;
    return { tipo: 'entrou', usuarioId: dono.id, email: dono.email, comSessao: false };
  }
  return { tipo: 'precisa-entrar', motivo: 'normal' };
}

export async function entrarComGoogle(): Promise<boolean> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: location.origin + location.pathname,
      scopes: ESCOPO_AGENDA,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  return !error;
}

/** Usada pelo motor de sincronização antes de falar com o servidor. */
export async function temSessaoValida(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/** Se a sessão acabar com o app aberto (por exemplo, saiu em outro lugar), recomeça pela tela de entrada. */
export function reiniciarSeSair(): void {
  supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') location.reload();
  });
}
