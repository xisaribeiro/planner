// Edge Function "gcal": guarda a credencial do Google e (fase 3) devolve só os eventos da agenda, somente leitura.
// A credencial fica na tabela google_credentials, que nenhum cliente consegue ler. Só esta função, com a service role.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EMAIL_PERMITIDO = 'xisaribeiro@gmail.com';
const ORIGENS_PERMITIDAS = ['https://xisaribeiro.github.io', 'http://127.0.0.1:4173', 'http://localhost:4173', 'http://localhost:5173'];

function cabecalhos(origem: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origem && ORIGENS_PERMITIDAS.includes(origem)) h['Access-Control-Allow-Origin'] = origem;
  return h;
}

function resposta(corpo: unknown, status: number, origem: string | null): Response {
  return new Response(JSON.stringify(corpo), { status, headers: cabecalhos(origem) });
}

Deno.serve(async (req) => {
  const origem = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabecalhos(origem) });
  if (req.method !== 'POST') return resposta({ erro: 'metodo' }, 405, origem);

  // 1. Quem está chamando? O JWT já foi verificado pela plataforma, aqui confere a conta.
  const autorizacao = req.headers.get('Authorization') ?? '';
  const urlDoProjeto = Deno.env.get('SUPABASE_URL')!;
  const cliente = createClient(urlDoProjeto, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: autorizacao } },
  });
  const { data, error } = await cliente.auth.getUser();
  const usuario = data?.user;
  if (error || !usuario) return resposta({ erro: 'sem-login' }, 401, origem);
  if ((usuario.email ?? '').toLowerCase() !== EMAIL_PERMITIDO) return resposta({ erro: 'conta-nao-permitida' }, 403, origem);

  const admin = createClient(urlDoProjeto, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return resposta({ erro: 'corpo-invalido' }, 400, origem);
  }

  // 2. Guardar a credencial entregue pelo Google no login.
  if (corpo['acao'] === 'salvar') {
    const token = corpo['refresh_token'];
    if (typeof token !== 'string' || token.length < 10) return resposta({ erro: 'token-invalido' }, 400, origem);
    const { error: erroDeGravacao } = await admin
      .from('google_credentials')
      .upsert({ user_id: usuario.id, refresh_token: token, updated_at: new Date().toISOString() });
    if (erroDeGravacao) return resposta({ erro: 'nao-gravou' }, 500, origem);
    return resposta({ ok: true }, 200, origem);
  }

  return resposta({ erro: 'acao-desconhecida' }, 400, origem);
});
