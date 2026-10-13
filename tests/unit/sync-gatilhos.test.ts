// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BancoLocal } from '../../src/db';
import { novoId } from '../../src/ids';
import { Sincronizador } from '../../src/sync';
import { RemotoDeMemoria } from './fakes';

async function aparelho(remoto: RemotoDeMemoria) {
  const banco = await BancoLocal.abrir(`gat-${Math.random()}`);
  banco.usuarioId = 'u1';
  const sinc = new Sincronizador(banco, remoto, { estaOnline: () => navigator.onLine, sobreposicaoMs: 0 });
  return { banco, sinc };
}

const afazer = (texto: string) => ({ id: novoId(), week_start: '2026-10-11', position: 0, text: texto, done: false, carried: false });

describe('gatilhos de sincronização (no navegador)', () => {
  it('a alteração agenda sozinha o envio', async () => {
    const remoto = new RemotoDeMemoria();
    const { banco, sinc } = await aparelho(remoto);
    const desligar = sinc.iniciar();
    await sinc.rodar();
    const l = await banco.salvar('todos', afazer('sozinho'));
    sinc.agendar(5);
    await new Promise((r) => setTimeout(r, 80));
    desligar();
    expect(remoto.obter('todos', l.id)).toMatchObject({ text: 'sozinho' });
  });

  it('ao voltar a ter internet, sincroniza', async () => {
    const remoto = new RemotoDeMemoria();
    const { banco, sinc } = await aparelho(remoto);
    const desligar = sinc.iniciar();
    await sinc.rodar();
    remoto.semRede = true;
    const l = await banco.salvar('todos', afazer('offline'));
    await sinc.rodar();
    expect(sinc.estado).toBe('offline');
    remoto.semRede = false;
    window.dispatchEvent(new Event('online'));
    await new Promise((r) => setTimeout(r, 80));
    desligar();
    expect(remoto.obter('todos', l.id)).toBeTruthy();
    expect(sinc.estado).toBe('sincronizado');
  });

  it('ao ficar offline mostra o estado offline', async () => {
    const remoto = new RemotoDeMemoria();
    const { sinc } = await aparelho(remoto);
    const desligar = sinc.iniciar();
    await sinc.rodar();
    window.dispatchEvent(new Event('offline'));
    expect(sinc.estado).toBe('offline');
    desligar();
  });
});
