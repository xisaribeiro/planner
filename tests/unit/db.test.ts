import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BancoLocal, proximoCarimbo } from '../../src/db';
import { novoId } from '../../src/ids';
import type { Afazer } from '../../src/tipos';

let n = 0;
async function novoBanco(): Promise<BancoLocal> {
  const b = await BancoLocal.abrir(`teste-${++n}-${Math.random()}`);
  b.usuarioId = 'u1';
  return b;
}

function afazer(texto: string, extra: Partial<Afazer> = {}) {
  return { id: novoId(), week_start: '2026-10-11', position: 0, text: texto, done: false, carried: false, ...extra };
}

describe('banco local', () => {
  let banco: BancoLocal;
  beforeEach(async () => {
    banco = await novoBanco();
  });

  it('salvar cria a linha com dono e datas, e coloca na fila de envio', async () => {
    const l = await banco.salvar('todos', afazer('regar as plantas'));
    expect(l.user_id).toBe('u1');
    expect(l.created_at).toBeTruthy();
    expect(l.updated_at).toBeTruthy();
    expect(l.deleted_at).toBeNull();
    expect(await banco.listar('todos')).toHaveLength(1);
    const fila = await banco.fila();
    expect(fila).toHaveLength(1);
    expect(fila[0]).toMatchObject({ tabela: 'todos', id: l.id, updated_at: l.updated_at });
  });

  it('atualizar muda só o que foi pedido e avança o updated_at', async () => {
    const l = await banco.salvar('todos', afazer('a'));
    const novo = await banco.atualizar('todos', l.id, { done: true });
    expect(novo.done).toBe(true);
    expect(novo.text).toBe('a');
    expect(Date.parse(novo.updated_at)).toBeGreaterThan(Date.parse(l.updated_at));
    expect(novo.created_at).toBe(l.created_at);
    expect(await banco.contarFila()).toBe(1);
  });

  it('várias edições seguidas ficam numa entrada só da fila, com o carimbo mais novo', async () => {
    const l = await banco.salvar('todos', afazer('a'));
    await banco.atualizar('todos', l.id, { text: 'b' });
    const ultima = await banco.atualizar('todos', l.id, { text: 'c' });
    const fila = await banco.fila();
    expect(fila).toHaveLength(1);
    expect(fila[0]!.updated_at).toBe(ultima.updated_at);
  });

  it('o carimbo nunca anda para trás, mesmo se o relógio estiver atrasado', () => {
    const futuro = new Date(Date.now() + 3_600_000).toISOString();
    expect(Date.parse(proximoCarimbo(futuro))).toBe(Date.parse(futuro) + 1);
    expect(Date.parse(proximoCarimbo())).toBeGreaterThan(0);
  });

  it('apagar só marca: a linha some da lista, continua guardada e vai para a fila', async () => {
    const l = await banco.salvar('todos', afazer('a'));
    await banco.apagar('todos', l.id);
    expect(await banco.listar('todos')).toHaveLength(0);
    expect(await banco.obter('todos', l.id)).toBeUndefined();
    const todas = await banco.listar('todos', { incluirApagadas: true });
    expect(todas).toHaveLength(1);
    expect(todas[0]!.deleted_at).toBeTruthy();
    expect((await banco.fila())[0]!.updated_at).toBe(todas[0]!.updated_at);
  });

  it('salvar de novo uma linha apagada traz ela de volta', async () => {
    const l = await banco.salvar('todos', afazer('a'));
    await banco.apagar('todos', l.id);
    await banco.salvar('todos', { ...afazer('a'), id: l.id });
    expect(await banco.listar('todos')).toHaveLength(1);
  });

  it('sem usuário não grava', async () => {
    const solto = await BancoLocal.abrir(`solto-${Math.random()}`);
    await expect(solto.salvar('todos', afazer('a'))).rejects.toThrow(/Sem usuário/);
  });

  it('guarda dados só deste aparelho em meta', async () => {
    await banco.gravarMeta('cursor:todos', '2026-10-13T12:00:00Z');
    expect(await banco.lerMeta('cursor:todos')).toBe('2026-10-13T12:00:00Z');
    await banco.apagarMeta('cursor:todos');
    expect(await banco.lerMeta('cursor:todos')).toBeUndefined();
  });
});

describe('aplicar o que veio do servidor', () => {
  const base = (id: string, texto: string, updated_at: string) => ({
    id,
    user_id: 'u1',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at,
    deleted_at: null,
    synced_at: '2026-10-13T12:00:00.000Z',
    week_start: '2026-10-11',
    position: 0,
    text: texto,
    done: false,
    carried: false,
  });

  it('linha nova entra', async () => {
    const banco = await novoBanco();
    const mudou = await banco.aplicarRemotas('todos', [base('r1', 'do servidor', '2026-10-10T00:00:00.000Z')]);
    expect(mudou).toBe(1);
    expect((await banco.listar('todos'))[0]!.text).toBe('do servidor');
    expect(await banco.contarFila()).toBe(0);
  });

  it('versão mais nova do servidor vence a local já enviada', async () => {
    const banco = await novoBanco();
    const l = await banco.salvar('todos', afazer('local'));
    await banco.confirmarEnvio('todos', [{ id: l.id, updated_at: l.updated_at }]);
    await banco.aplicarRemotas('todos', [base(l.id, 'remota', new Date(Date.parse(l.updated_at) + 5000).toISOString())]);
    expect((await banco.obter('todos', l.id))!.text).toBe('remota');
  });

  it('versão mais antiga do servidor não vence a local', async () => {
    const banco = await novoBanco();
    const l = await banco.salvar('todos', afazer('local'));
    await banco.confirmarEnvio('todos', [{ id: l.id, updated_at: l.updated_at }]);
    await banco.aplicarRemotas('todos', [base(l.id, 'velha', '2000-01-01T00:00:00.000Z')]);
    expect((await banco.obter('todos', l.id))!.text).toBe('local');
  });

  it('edição local com envio pendente nunca é sobrescrita', async () => {
    const banco = await novoBanco();
    const l = await banco.salvar('todos', afazer('local pendente'));
    await banco.aplicarRemotas('todos', [base(l.id, 'remota', '2099-01-01T00:00:00.000Z')]);
    expect((await banco.obter('todos', l.id))!.text).toBe('local pendente');
  });

  it('confirmar envio não tira da fila uma linha editada de novo durante o envio', async () => {
    const banco = await novoBanco();
    const l = await banco.salvar('todos', afazer('v1'));
    const depois = await banco.atualizar('todos', l.id, { text: 'v2' });
    await banco.confirmarEnvio('todos', [{ id: l.id, updated_at: l.updated_at }]);
    const fila = await banco.fila();
    expect(fila).toHaveLength(1);
    expect(fila[0]!.updated_at).toBe(depois.updated_at);
  });

  it('avisa quem está ouvindo quando a tabela muda', async () => {
    const banco = await novoBanco();
    const vistas: string[] = [];
    banco.aoAlterar((t) => vistas.push(t));
    await banco.salvar('todos', afazer('a'));
    await banco.aplicarRemotas('wishes', [
      { id: 'w1', user_id: 'u1', created_at: 'x', updated_at: '2026-10-10T00:00:00.000Z', deleted_at: null },
    ]);
    expect(vistas).toEqual(['todos', 'wishes']);
  });
});
