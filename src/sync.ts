/**
 * Sincronização offline first, última escrita vence.
 * Envia a fila local (pais antes de filhos), depois busca o que mudou no servidor desde o último `synced_at` visto.
 * Sem realtime e sem trabalho em segundo plano. Se não houver rede, tudo continua funcionando e a fila espera.
 */
import type { BancoLocal } from './db';
import { TABELAS, type Comum, type Tabela } from './tipos';

export class ErroDeRede extends Error {}
export class ErroDeSessao extends Error {}
export class ErroDoServidor extends Error {
  constructor(
    mensagem: string,
    readonly codigo = '',
  ) {
    super(mensagem);
  }
}

export interface PedidoDeLeitura {
  /** Pega só o que mudou desde este `synced_at`. Nulo traz tudo. */
  desde: string | null;
  /** Inclui as linhas com exatamente o mesmo `synced_at` (usado na primeira página, com sobreposição). */
  inclusivo: boolean;
  limite: number;
}

/** O que o motor precisa do servidor. A implementação real fala com o Supabase, os testes usam uma em memória. */
export interface Remoto {
  enviar(tabela: Tabela, linhas: Record<string, unknown>[]): Promise<void>;
  receber(tabela: Tabela, pedido: PedidoDeLeitura): Promise<(Comum & { synced_at: string })[]>;
}

export type EstadoDeSync = 'sincronizado' | 'sincronizando' | 'aguardando' | 'offline' | 'sem-sessao' | 'erro';

export interface OpcoesDoSincronizador {
  tamanhoDoLote?: number;
  limiteDeLeitura?: number;
  /** Relê um pouco antes do último cursor, para não perder linha gravada em transação que terminou depois. */
  sobreposicaoMs?: number;
  estaOnline?: () => boolean;
  /** Confere se há login válido antes de falar com o servidor. */
  temSessao?: () => Promise<boolean>;
}

function pedacos<T>(lista: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += n) out.push(lista.slice(i, i + n));
  return out;
}

export class Sincronizador {
  private estadoAtual: EstadoDeSync = 'aguardando';
  private ouvintes = new Set<(e: EstadoDeSync) => void>();
  private rodando: Promise<void> | null = null;
  private repetir = false;
  private temporizador: ReturnType<typeof setTimeout> | undefined;
  private houveFalhaDoServidor = false;
  private ultimaRodada = 0;

  private readonly lote: number;
  private readonly limite: number;
  private readonly sobreposicao: number;
  private readonly estaOnline: () => boolean;
  private readonly temSessao: (() => Promise<boolean>) | undefined;

  constructor(
    private readonly banco: BancoLocal,
    private readonly remoto: Remoto,
    opcoes: OpcoesDoSincronizador = {},
  ) {
    this.lote = opcoes.tamanhoDoLote ?? 200;
    this.limite = opcoes.limiteDeLeitura ?? 1000;
    this.sobreposicao = opcoes.sobreposicaoMs ?? 5000;
    this.estaOnline = opcoes.estaOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    this.temSessao = opcoes.temSessao;
  }

  get estado(): EstadoDeSync {
    return this.estadoAtual;
  }

  aoMudarEstado(ouvinte: (e: EstadoDeSync) => void): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  private definir(e: EstadoDeSync): void {
    if (e === this.estadoAtual) return;
    this.estadoAtual = e;
    for (const o of this.ouvintes) o(e);
  }

  /** Uma rodada completa. Se já tem uma rodando, pede para repetir quando ela acabar. */
  rodar(): Promise<void> {
    if (this.rodando) {
      this.repetir = true;
      return this.rodando;
    }
    this.rodando = (async () => {
      do {
        this.repetir = false;
        if (!this.estaOnline()) {
          this.definir('offline');
          break;
        }
        if (this.temSessao && !(await this.temSessao())) {
          this.definir('sem-sessao');
          break;
        }
        this.definir('sincronizando');
        this.houveFalhaDoServidor = false;
        try {
          await this.enviar();
          await this.receber();
          this.ultimaRodada = Date.now();
          const pendentes = await this.banco.fila();
          if (pendentes.length === 0) this.definir('sincronizado');
          else this.definir(this.houveFalhaDoServidor || pendentes.some((p) => p.tentativas > 0) ? 'erro' : 'aguardando');
        } catch (e) {
          this.definir(e instanceof ErroDeRede ? 'offline' : e instanceof ErroDeSessao ? 'sem-sessao' : 'erro');
          break;
        }
      } while (this.repetir);
    })().finally(() => {
      this.rodando = null;
    });
    return this.rodando;
  }

  /** Espera alguns segundos depois de uma alteração, para juntar várias num envio só. */
  agendar(esperaMs = 3000): void {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => void this.rodar(), esperaMs);
  }

  // ---------------------------------------------------------------- envio
  private async enviar(): Promise<void> {
    for (const tabela of TABELAS) {
      const itens = await this.banco.linhasDaFila(tabela);
      if (itens.length === 0) continue;
      for (const grupo of pedacos(itens, this.lote)) {
        await this.enviarGrupo(tabela, grupo);
      }
    }
  }

  private async enviarGrupo(tabela: Tabela, grupo: { linha: Record<string, unknown> }[]): Promise<void> {
    const paraEnviar = grupo.map((g) => {
      const { synced_at: _ignorado, ...resto } = g.linha;
      return resto;
    });
    const confirmados = () => grupo.map((g) => ({ id: g.linha['id'] as string, updated_at: g.linha['updated_at'] as string }));
    try {
      await this.remoto.enviar(tabela, paraEnviar);
      await this.banco.confirmarEnvio(tabela, confirmados());
    } catch (e) {
      if (!(e instanceof ErroDoServidor)) throw e;
      if (grupo.length > 1) {
        // Descobre qual linha o servidor recusou, sem travar as outras.
        for (const unica of grupo) await this.enviarGrupo(tabela, [unica]);
        return;
      }
      this.houveFalhaDoServidor = true;
      await this.banco.registrarFalha(tabela, [grupo[0]!.linha['id'] as string]);
    }
  }

  // ---------------------------------------------------------------- leitura
  private async receber(): Promise<void> {
    for (const tabela of TABELAS) {
      const chave = `cursor:${tabela}`;
      let cursor = (await this.banco.lerMeta<string>(chave)) ?? null;
      let primeira = true;
      for (;;) {
        const desde = primeira && cursor ? new Date(Date.parse(cursor) - this.sobreposicao).toISOString() : cursor;
        const linhas = await this.remoto.receber(tabela, { desde, inclusivo: primeira, limite: this.limite });
        primeira = false;
        await this.banco.aplicarRemotas(tabela, linhas);
        if (linhas.length > 0) {
          const maior = linhas.reduce((m, l) => (Date.parse(l.synced_at) > Date.parse(m) ? l.synced_at : m), linhas[0]!.synced_at);
          if (!cursor || Date.parse(maior) > Date.parse(cursor)) {
            cursor = maior;
            await this.banco.gravarMeta(chave, cursor);
          }
        }
        if (linhas.length < this.limite) break;
      }
    }
  }

  // ---------------------------------------------------------------- quando sincronizar
  /** Liga os gatilhos: ao abrir, ao voltar a ter internet, ao voltar ao primeiro plano e depois de cada alteração. */
  iniciar(): () => void {
    const aoVoltarOnline = () => void this.rodar();
    const aoFicarOffline = () => this.definir('offline');
    const aoVoltarAoPrimeiroPlano = () => {
      if (document.visibilityState === 'visible' && Date.now() - this.ultimaRodada > 10_000) void this.rodar();
    };
    window.addEventListener('online', aoVoltarOnline);
    window.addEventListener('offline', aoFicarOffline);
    document.addEventListener('visibilitychange', aoVoltarAoPrimeiroPlano);
    const soltar = this.banco.aoAlterar(() => this.agendar());
    void this.rodar();
    return () => {
      window.removeEventListener('online', aoVoltarOnline);
      window.removeEventListener('offline', aoFicarOffline);
      document.removeEventListener('visibilitychange', aoVoltarAoPrimeiroPlano);
      soltar();
      clearTimeout(this.temporizador);
    };
  }
}
