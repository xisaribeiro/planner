import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BancoLocal } from '../../src/db';
import { novoId } from '../../src/ids';
import { Sincronizador } from '../../src/sync';
import type { Afazer, Avaliacao, Materia, Semestre } from '../../src/tipos';
import { RemotoDeMemoria } from './fakes';

let n = 0;
async function aparelho(remoto: RemotoDeMemoria, opcoes: ConstructorParameters<typeof Sincronizador>[2] = {}) {
  const banco = await BancoLocal.abrir(`ap-${++n}-${Math.random()}`);
  banco.usuarioId = 'u1';
  const sinc = new Sincronizador(banco, remoto, { estaOnline: () => true, sobreposicaoMs: 0, ...opcoes });
  return { banco, sinc };
}

const afazer = (texto: string, id = novoId()): Omit<Afazer, 'user_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'synced_at'> => ({
  id,
  week_start: '2026-10-11',
  position: 0,
  text: texto,
  done: false,
  carried: false,
});

describe('envio', () => {
  it('sobe a fila, esvazia e fica sincronizado', async () => {
    const remoto = new RemotoDeMemoria();
    const { banco, sinc } = await aparelho(remoto);
    const l = await banco.salvar('todos', afazer('comprar ração'));
    await sinc.rodar();
    expect(remoto.obter('todos', l.id)).toMatchObject({ text: 'comprar ração', user_id: 'u1' });
    expect(await banco.contarFila()).toBe(0);
    expect(sinc.estado).toBe('sincronizado');
  });

  it('manda pais antes dos filhos, mesmo gravados ao contrário', async () => {
    const remoto = new RemotoDeMemoria();
    const { banco, sinc } = await aparelho(remoto);
    const semId = novoId();
    const matId = novoId();
    const avId = novoId();
    await banco.salvar('assessments', {
      id: avId, subject_id: matId, kind: 'prova', title: 'P1', rule_key: 'p1', due_on: '2026-10-15', date_confirmed: true,
      date_source: 'manual', google_event_id: null, weight: null, points_max: null, grade: null, done: false, condition_text: null,
    } satisfies Omit<Avaliacao, 'user_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'synced_at'>);
    await banco.salvar('subjects', {
      id: matId, semester_id: semId, name: 'Cálculo II', weekday: 4, starts_at: null, ends_at: null, ends_on: null, ends_on_confirmed: true,
      absence_limit: 3, absence_unit: 1, prior_absences: 0, grade_rule: {}, rule_text: '',
    } satisfies Omit<Materia, 'user_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'synced_at'>);
    await banco.salvar('semesters', {
      id: semId, code: '2026.2', starts_on: null, ends_on: null, pass_grade: 6, closed_at: null,
    } satisfies Omit<Semestre, 'user_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'synced_at'>);
    await sinc.rodar();
    expect(remoto.ordemDeEnvio).toEqual(['semesters', 'subjects', 'assessments']);
  });

  it('sem internet a fila espera e nada se perde, depois sobe', async () => {
    const remoto = new RemotoDeMemoria();
    remoto.semRede = true;
    const { banco, sinc } = await aparelho(remoto);
    const l = await banco.salvar('todos', afazer('feito no metrô'));
    await sinc.rodar();
    expect(sinc.estado).toBe('offline');
    expect(await banco.contarFila()).toBe(1);
    expect(await banco.listar('todos')).toHaveLength(1);

    remoto.semRede = false;
    await sinc.rodar();
    expect(sinc.estado).toBe('sincronizado');
    expect(remoto.obter('todos', l.id)).toBeTruthy();
  });

  it('com o aparelho offline nem chama o servidor', async () => {
    const remoto = new RemotoDeMemoria();
    const { banco, sinc } = await aparelho(remoto, { estaOnline: () => false });
    await banco.salvar('todos', afazer('a'));
    await sinc.rodar();
    expect(sinc.estado).toBe('offline');
    expect(remoto.leituras).toBe(0);
    expect(remoto.ordemDeEnvio).toEqual([]);
  });

  it('sem login válido avisa e não fala com o servidor', async () => {
    const remoto = new RemotoDeMemoria();
    const { banco, sinc } = await aparelho(remoto, { temSessao: async () => false });
    await banco.salvar('todos', afazer('a'));
    await sinc.rodar();
    expect(sinc.estado).toBe('sem-sessao');
    expect(remoto.leituras).toBe(0);
    expect(await banco.contarFila()).toBe(1);
  });

  it('uma linha recusada pelo servidor não trava as outras', async () => {
    const remoto = new RemotoDeMemoria();
    const { banco, sinc } = await aparelho(remoto);
    const boa1 = await banco.salvar('todos', afazer('boa 1'));
    const ruim = await banco.salvar('todos', afazer('ruim'));
    const boa2 = await banco.salvar('todos', afazer('boa 2'));
    remoto.recusar.add(ruim.id);
    await sinc.rodar();
    expect(remoto.obter('todos', boa1.id)).toBeTruthy();
    expect(remoto.obter('todos', boa2.id)).toBeTruthy();
    expect(remoto.obter('todos', ruim.id)).toBeUndefined();
    const fila = await banco.fila();
    expect(fila).toHaveLength(1);
    expect(fila[0]).toMatchObject({ id: ruim.id, tentativas: 1 });
    expect(sinc.estado).toBe('erro');
  });

  it('edição feita durante o envio continua na fila e sobe na rodada seguinte', async () => {
    const remoto = new RemotoDeMemoria();
    const { banco, sinc } = await aparelho(remoto);
    const l = await banco.salvar('todos', afazer('v1'));
    let editou = false;
    remoto.aoEnviar = async () => {
      if (editou) return;
      editou = true;
      await banco.atualizar('todos', l.id, { text: 'v2' });
    };
    await sinc.rodar();
    // A rodada subiu a v1, e a v2 (feita durante o envio) continua na fila.
    expect(remoto.obter('todos', l.id)).toMatchObject({ text: 'v1' });
    expect(await banco.contarFila()).toBe(1);
    await sinc.rodar();
    expect(remoto.obter('todos', l.id)).toMatchObject({ text: 'v2' });
    expect(await banco.contarFila()).toBe(0);
  });

  it('manda em lotes', async () => {
    const remoto = new RemotoDeMemoria();
    const { banco, sinc } = await aparelho(remoto, { tamanhoDoLote: 2 });
    for (let i = 0; i < 5; i++) await banco.salvar('todos', afazer(`t${i}`));
    await sinc.rodar();
    expect(remoto.ordemDeEnvio).toEqual(['todos', 'todos', 'todos']);
    expect(remoto.tabelas.get('todos')!.size).toBe(5);
  });
});

describe('dois aparelhos, última escrita vence', () => {
  it('a edição mais nova ganha nos dois lados, não importa quem sincroniza primeiro', async () => {
    const remoto = new RemotoDeMemoria();
    const celular = await aparelho(remoto);
    const notebook = await aparelho(remoto);

    const id = novoId();
    await celular.banco.salvar('todos', afazer('original', id));
    await celular.sinc.rodar();
    await notebook.sinc.rodar();
    expect((await notebook.banco.obter('todos', id))!.text).toBe('original');

    // Os dois editam offline. O notebook edita depois.
    await celular.banco.atualizar('todos', id, { text: 'do celular' });
    await new Promise((r) => setTimeout(r, 15));
    await notebook.banco.atualizar('todos', id, { text: 'do notebook' });

    // O celular sincroniza por último, mas a edição dele é mais antiga.
    await notebook.sinc.rodar();
    await celular.sinc.rodar();
    await notebook.sinc.rodar();

    expect((await celular.banco.obter('todos', id))!.text).toBe('do notebook');
    expect((await notebook.banco.obter('todos', id))!.text).toBe('do notebook');
    expect(remoto.obter('todos', id)).toMatchObject({ text: 'do notebook' });
  });

  it('marcar um check no celular aparece no outro aparelho depois de sincronizar', async () => {
    const remoto = new RemotoDeMemoria();
    const celular = await aparelho(remoto);
    const ipad = await aparelho(remoto);
    const id = novoId();
    await celular.banco.salvar('todos', afazer('ligar para a dentista', id));
    await celular.sinc.rodar();
    await ipad.sinc.rodar();
    await celular.banco.atualizar('todos', id, { done: true });
    await celular.sinc.rodar();
    await ipad.sinc.rodar();
    expect((await ipad.banco.obter('todos', id))!.done).toBe(true);
  });

  it('apagar num aparelho some no outro, sem apagar de verdade', async () => {
    const remoto = new RemotoDeMemoria();
    const a = await aparelho(remoto);
    const b = await aparelho(remoto);
    const id = novoId();
    await a.banco.salvar('todos', afazer('x', id));
    await a.sinc.rodar();
    await b.sinc.rodar();
    expect(await b.banco.listar('todos')).toHaveLength(1);
    await a.banco.apagar('todos', id);
    await a.sinc.rodar();
    await b.sinc.rodar();
    expect(await b.banco.listar('todos')).toHaveLength(0);
    expect(await b.banco.listar('todos', { incluirApagadas: true })).toHaveLength(1);
    expect(remoto.obter('todos', id)!.deleted_at).toBeTruthy();
  });

  it('o servidor ignora uma edição antiga que chega atrasada e o aparelho se acerta', async () => {
    const remoto = new RemotoDeMemoria();
    const a = await aparelho(remoto);
    const id = novoId();
    await a.banco.salvar('todos', afazer('minha', id));
    // Outro aparelho já gravou, no futuro, uma versão mais nova.
    await remoto.gravarDeFora('todos', {
      id, user_id: 'u1', created_at: '2026-10-01T00:00:00.000Z', updated_at: '2099-01-01T00:00:00.000Z', deleted_at: null,
      week_start: '2026-10-11', position: 0, text: 'mais nova', done: false, carried: false,
    } as never);
    await a.sinc.rodar();
    expect(remoto.obter('todos', id)).toMatchObject({ text: 'mais nova' });
    // Depois da rodada, o aparelho também enxerga a versão vencedora.
    await a.sinc.rodar();
    expect((await a.banco.obter('todos', id))!.text).toBe('mais nova');
  });
});

describe('leitura', () => {
  it('na segunda rodada só vem o que mudou depois do último cursor', async () => {
    const remoto = new RemotoDeMemoria();
    const a = await aparelho(remoto);
    const b = await aparelho(remoto);
    await a.banco.salvar('todos', afazer('um'));
    await a.sinc.rodar();
    await b.sinc.rodar();
    expect(await b.banco.listar('todos')).toHaveLength(1);

    await a.banco.salvar('todos', afazer('dois'));
    await a.sinc.rodar();
    await b.sinc.rodar();
    expect(await b.banco.listar('todos')).toHaveLength(2);
    expect(await b.banco.lerMeta('cursor:todos')).toBeTruthy();
  });

  it('pagina quando há mais linhas que o limite', async () => {
    const remoto = new RemotoDeMemoria();
    const a = await aparelho(remoto);
    const b = await aparelho(remoto, { limiteDeLeitura: 2 });
    for (let i = 0; i < 7; i++) await a.banco.salvar('todos', afazer(`t${i}`));
    await a.sinc.rodar();
    await b.sinc.rodar();
    expect(await b.banco.listar('todos')).toHaveLength(7);
  });

  it('a sobreposição pega linha cujo synced_at ficou um pouco para trás do cursor', async () => {
    const remoto = new RemotoDeMemoria();
    const b = await aparelho(remoto, { sobreposicaoMs: 5000 });
    await remoto.gravarDeFora('todos', {
      id: 'x1', user_id: 'u1', created_at: 'c', updated_at: '2026-10-10T00:00:00.000Z', deleted_at: null,
      week_start: '2026-10-11', position: 0, text: 'primeira', done: false, carried: false,
    } as never);
    await b.sinc.rodar();
    // Uma linha que o servidor registra com synced_at logo abaixo do cursor (transação que terminou depois).
    const cursor = (await b.banco.lerMeta<string>('cursor:todos'))!;
    const atrasada = {
      id: 'x2', user_id: 'u1', created_at: 'c', updated_at: '2026-10-10T00:00:00.000Z', deleted_at: null,
      synced_at: new Date(Date.parse(cursor) - 2000).toISOString(),
      week_start: '2026-10-11', position: 0, text: 'atrasada', done: false, carried: false,
    };
    remoto.tabelas.get('todos')!.set('x2', atrasada as never);
    await b.sinc.rodar();
    expect((await b.banco.listar('todos')).map((l) => l.id).sort()).toEqual(['x1', 'x2']);
  });
});

describe('estado', () => {
  it('avisa quem está ouvindo a cada mudança de estado', async () => {
    const remoto = new RemotoDeMemoria();
    const { banco, sinc } = await aparelho(remoto);
    const vistos: string[] = [];
    sinc.aoMudarEstado((e) => vistos.push(e));
    await banco.salvar('todos', afazer('a'));
    await sinc.rodar();
    expect(vistos).toEqual(['sincronizando', 'sincronizado']);
  });
});
