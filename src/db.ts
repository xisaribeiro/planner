/**
 * Banco local (IndexedDB). É a fonte da verdade da interface: a tela nunca espera a rede.
 * Toda alteração grava aqui primeiro e entra numa fila de envio (uma entrada por linha, a mais recente).
 * Apagar é marcar `deleted_at`, nunca remover de verdade.
 */
import { openDB, type IDBPDatabase } from 'idb';
import { TABELAS, type Comum, type MapaDeTabelas, type Tabela } from './tipos';

export interface EntradaDaFila {
  tabela: Tabela;
  id: string;
  updated_at: string;
  tentativas: number;
}

type CamposDoServidor = 'user_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'synced_at';
/** O que quem chama informa para criar ou substituir uma linha. O resto o banco local preenche. */
export type NovaLinha<K extends Tabela> = Omit<MapaDeTabelas[K], CamposDoServidor>;

const VERSAO = 1;

/** Carimbo de edição que nunca anda para trás no mesmo aparelho, mesmo com o relógio ajustado. */
export function proximoCarimbo(anterior?: string): string {
  const agora = Date.now();
  const minimo = anterior ? Date.parse(anterior) + 1 : 0;
  return new Date(Math.max(agora, minimo)).toISOString();
}

export function tempo(texto: string): number {
  return Date.parse(texto);
}

type Ouvinte = (tabela: Tabela) => void;

export class BancoLocal {
  /** Dono das linhas criadas neste aparelho. Vem do login. */
  usuarioId = '';
  private ouvintes = new Set<Ouvinte>();

  private constructor(private readonly bd: IDBPDatabase) {}

  static async abrir(nome = 'planner'): Promise<BancoLocal> {
    const bd = await openDB(nome, VERSAO, {
      upgrade(db) {
        for (const t of TABELAS) db.createObjectStore(t, { keyPath: 'id' });
        db.createObjectStore('fila', { keyPath: ['tabela', 'id'] });
        db.createObjectStore('meta', { keyPath: 'chave' });
      },
    });
    return new BancoLocal(bd);
  }

  fechar(): void {
    this.bd.close();
  }

  // ---------------------------------------------------------------- dados só deste aparelho
  async lerMeta<T>(chave: string): Promise<T | undefined> {
    const r = (await this.bd.get('meta', chave)) as { chave: string; valor: T } | undefined;
    return r?.valor;
  }

  async gravarMeta<T>(chave: string, valor: T): Promise<void> {
    await this.bd.put('meta', { chave, valor });
  }

  async apagarMeta(chave: string): Promise<void> {
    await this.bd.delete('meta', chave);
  }

  // ---------------------------------------------------------------- leitura
  async listar<K extends Tabela>(tabela: K, opcoes: { incluirApagadas?: boolean } = {}): Promise<MapaDeTabelas[K][]> {
    const todas = (await this.bd.getAll(tabela)) as MapaDeTabelas[K][];
    return opcoes.incluirApagadas ? todas : todas.filter((l) => !l.deleted_at);
  }

  async obter<K extends Tabela>(tabela: K, id: string): Promise<MapaDeTabelas[K] | undefined> {
    const l = (await this.bd.get(tabela, id)) as MapaDeTabelas[K] | undefined;
    return l && !l.deleted_at ? l : undefined;
  }

  // ---------------------------------------------------------------- escrita (sempre local primeiro)
  /** Cria a linha, ou substitui por inteiro se o id já existe. */
  async salvar<K extends Tabela>(tabela: K, linha: NovaLinha<K>): Promise<MapaDeTabelas[K]> {
    return this.gravar(
      tabela,
      linha.id,
      (existente) => ({ ...(existente ?? {}), ...linha, deleted_at: null }) as Record<string, unknown>,
    );
  }

  /** Muda só alguns campos de uma linha que existe. */
  async atualizar<K extends Tabela>(tabela: K, id: string, mudancas: Partial<NovaLinha<K>>): Promise<MapaDeTabelas[K]> {
    return this.gravar(tabela, id, (existente) => {
      if (!existente) throw new Error(`Linha ${id} não existe em ${tabela}`);
      return { ...existente, ...mudancas };
    });
  }

  /** Marca como apagada. A linha continua guardada e sincroniza como qualquer outra alteração. */
  async apagar(tabela: Tabela, id: string): Promise<void> {
    await this.gravar(tabela, id, (existente) => {
      if (!existente) throw new Error(`Linha ${id} não existe em ${tabela}`);
      return { ...existente, deleted_at: proximoCarimbo(existente['updated_at'] as string) };
    });
  }

  private async gravar<K extends Tabela>(
    tabela: K,
    id: string,
    montar: (existente: Record<string, unknown> | undefined) => Record<string, unknown>,
  ): Promise<MapaDeTabelas[K]> {
    if (!this.usuarioId) throw new Error('Sem usuário: entre antes de gravar.');
    const tx = this.bd.transaction([tabela, 'fila'], 'readwrite');
    const loja = tx.objectStore(tabela);
    const existente = (await loja.get(id)) as Record<string, unknown> | undefined;
    const base = montar(existente);
    const updated_at = proximoCarimbo(existente?.['updated_at'] as string | undefined);
    const agora = new Date().toISOString();
    const linha: Record<string, unknown> = {
      ...base,
      id,
      user_id: existente?.['user_id'] ?? this.usuarioId,
      created_at: existente?.['created_at'] ?? agora,
      updated_at,
      // Salvar de novo uma linha apagada traz ela de volta, a não ser que quem chamou esteja apagando.
      deleted_at: 'deleted_at' in base && base['deleted_at'] ? base['deleted_at'] : null,
    };
    await loja.put(linha);
    const fila: EntradaDaFila = { tabela, id, updated_at, tentativas: 0 };
    await tx.objectStore('fila').put(fila);
    await tx.done;
    this.avisar(tabela);
    return linha as unknown as MapaDeTabelas[K];
  }

  // ---------------------------------------------------------------- fila de envio
  async fila(): Promise<EntradaDaFila[]> {
    return (await this.bd.getAll('fila')) as EntradaDaFila[];
  }

  async contarFila(): Promise<number> {
    return this.bd.count('fila');
  }

  async linhasDaFila(tabela: Tabela): Promise<{ entrada: EntradaDaFila; linha: Record<string, unknown> }[]> {
    const entradas = (await this.fila()).filter((e) => e.tabela === tabela);
    const out: { entrada: EntradaDaFila; linha: Record<string, unknown> }[] = [];
    for (const entrada of entradas) {
      const linha = (await this.bd.get(tabela, entrada.id)) as Record<string, unknown> | undefined;
      if (linha) out.push({ entrada, linha });
    }
    return out;
  }

  /** Tira da fila o que subiu, a não ser que a linha tenha sido editada de novo enquanto enviava. */
  async confirmarEnvio(tabela: Tabela, enviados: { id: string; updated_at: string }[]): Promise<void> {
    const tx = this.bd.transaction('fila', 'readwrite');
    for (const e of enviados) {
      const atual = (await tx.store.get([tabela, e.id])) as EntradaDaFila | undefined;
      if (atual && atual.updated_at === e.updated_at) await tx.store.delete([tabela, e.id]);
    }
    await tx.done;
  }

  async registrarFalha(tabela: Tabela, ids: string[]): Promise<void> {
    const tx = this.bd.transaction('fila', 'readwrite');
    for (const id of ids) {
      const atual = (await tx.store.get([tabela, id])) as EntradaDaFila | undefined;
      if (atual) await tx.store.put({ ...atual, tentativas: atual.tentativas + 1 });
    }
    await tx.done;
  }

  // ---------------------------------------------------------------- vindo do servidor
  /**
   * Junta o que veio do servidor. Linha com envio pendente aqui não é tocada (a edição local é mais nova).
   * Fora isso, vale a última escrita: o servidor só ganha se o updated_at dele for igual ou maior.
   */
  async aplicarRemotas(tabela: Tabela, remotas: Comum[]): Promise<number> {
    if (remotas.length === 0) return 0;
    const tx = this.bd.transaction([tabela, 'fila'], 'readwrite');
    const loja = tx.objectStore(tabela);
    const fila = tx.objectStore('fila');
    let mudou = 0;
    for (const r of remotas) {
      if (await fila.get([tabela, r.id])) continue;
      const local = (await loja.get(r.id)) as Comum | undefined;
      if (!local || tempo(r.updated_at) >= tempo(local.updated_at)) {
        await loja.put(r);
        mudou++;
      }
    }
    await tx.done;
    if (mudou) this.avisar(tabela);
    return mudou;
  }

  // ---------------------------------------------------------------- avisos de mudança
  aoAlterar(ouvinte: Ouvinte): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  private avisar(tabela: Tabela): void {
    for (const o of this.ouvintes) o(tabela);
  }
}
