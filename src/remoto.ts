/** Implementação do servidor real (Supabase). O motor de sincronização só conhece a interface `Remoto`. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ErroDeRede, ErroDeSessao, ErroDoServidor, type Remoto } from './sync';
import type { Comum } from './tipos';

interface ErroPostgrest {
  message: string;
  code?: string;
}

/** O PostgREST sempre manda um `code` nos erros do servidor. Sem código, a requisição nem chegou: é rede. */
function traduzir(erro: ErroPostgrest): Error {
  if (!erro.code) return new ErroDeRede(erro.message);
  if (erro.code === 'PGRST301' || erro.code === 'PGRST303' || /jwt/i.test(erro.message)) return new ErroDeSessao(erro.message);
  return new ErroDoServidor(erro.message, erro.code);
}

export function remotoSupabase(cliente: SupabaseClient): Remoto {
  return {
    async enviar(tabela, linhas) {
      const { error } = await cliente.from(tabela).upsert(linhas, { onConflict: 'id' });
      if (error) throw traduzir(error);
    },
    async receber(tabela, pedido) {
      let consulta = cliente.from(tabela).select('*').order('synced_at', { ascending: true }).limit(pedido.limite);
      if (pedido.desde) {
        consulta = pedido.inclusivo ? consulta.gte('synced_at', pedido.desde) : consulta.gt('synced_at', pedido.desde);
      }
      const { data, error } = await consulta;
      if (error) throw traduzir(error);
      return (data ?? []) as (Comum & { synced_at: string })[];
    },
  };
}
