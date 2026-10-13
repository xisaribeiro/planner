import { ErroDeRede, ErroDoServidor, type PedidoDeLeitura, type Remoto } from '../../src/sync';
import type { Comum, Tabela } from '../../src/tipos';

type Linha = Record<string, unknown> & Comum;

/** Servidor em memória que imita o Supabase: última escrita vence e `synced_at` definido no servidor. */
export class RemotoDeMemoria implements Remoto {
  tabelas = new Map<Tabela, Map<string, Linha>>();
  /** Ordem em que as tabelas foram enviadas, para conferir pais antes de filhos. */
  ordemDeEnvio: Tabela[] = [];
  leituras = 0;
  semRede = false;
  recusar = new Set<string>();
  aoEnviar: ((tabela: Tabela, linhas: Record<string, unknown>[]) => Promise<void> | void) | null = null;
  private relogio = Date.parse('2026-10-13T12:00:00.000Z');

  private tabela(t: Tabela): Map<string, Linha> {
    let m = this.tabelas.get(t);
    if (!m) this.tabelas.set(t, (m = new Map()));
    return m;
  }

  private proximoSyncedAt(): string {
    this.relogio += 1000;
    return new Date(this.relogio).toISOString();
  }

  async enviar(tabela: Tabela, linhas: Record<string, unknown>[]): Promise<void> {
    if (this.semRede) throw new ErroDeRede('Failed to fetch');
    if (linhas.some((l) => this.recusar.has(l['id'] as string))) throw new ErroDoServidor('violação de chave', '23503');
    this.ordemDeEnvio.push(tabela);
    await this.aoEnviar?.(tabela, linhas);
    const m = this.tabela(tabela);
    for (const l of linhas as Linha[]) {
      const antiga = m.get(l.id);
      // Gatilho sync_guard: só aceita se o updated_at recebido for maior que o guardado.
      if (antiga && Date.parse(l.updated_at) <= Date.parse(antiga.updated_at)) continue;
      m.set(l.id, { ...l, synced_at: this.proximoSyncedAt() });
    }
  }

  async receber(tabela: Tabela, pedido: PedidoDeLeitura): Promise<(Comum & { synced_at: string })[]> {
    if (this.semRede) throw new ErroDeRede('Failed to fetch');
    this.leituras++;
    const todas = [...this.tabela(tabela).values()] as (Linha & { synced_at: string })[];
    const filtradas = todas
      .filter((l) => {
        if (!pedido.desde) return true;
        const d = Date.parse(pedido.desde);
        const s = Date.parse(l.synced_at);
        return pedido.inclusivo ? s >= d : s > d;
      })
      .sort((a, b) => Date.parse(a.synced_at) - Date.parse(b.synced_at))
      .slice(0, pedido.limite);
    return filtradas.map((l) => ({ ...l }));
  }

  /** Simula outro aparelho gravando direto no servidor. */
  async gravarDeFora(tabela: Tabela, linha: Linha): Promise<void> {
    await this.enviar(tabela, [linha]);
  }

  obter(tabela: Tabela, id: string): Linha | undefined {
    return this.tabela(tabela).get(id);
  }
}
