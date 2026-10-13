import { describe, expect, it } from 'vitest';
import { preencher, textos } from '../../src/strings';

const TRAVESSAO_LONGO = '—';
const TRAVESSAO_CURTO = '–';

function coletar(valor: unknown, caminho: string, saida: Array<[string, string]>): void {
  if (typeof valor === 'string') saida.push([caminho, valor]);
  else if (Array.isArray(valor)) valor.forEach((v, i) => coletar(v, `${caminho}[${i}]`, saida));
  else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) coletar(v, caminho ? `${caminho}.${k}` : k, saida);
  }
}

describe('textos da interface', () => {
  const todos: Array<[string, string]> = [];
  coletar(textos, '', todos);

  it('existem textos para conferir', () => {
    expect(todos.length).toBeGreaterThan(20);
  });

  it('nenhum texto tem travessão', () => {
    const ruins = todos.filter(([, t]) => t.includes(TRAVESSAO_LONGO) || t.includes(TRAVESSAO_CURTO));
    expect(ruins).toEqual([]);
  });

  it('nenhum texto tem ponto e vírgula', () => {
    const ruins = todos.filter(([, t]) => t.includes(';'));
    expect(ruins).toEqual([]);
  });

  it('preencher troca os marcadores', () => {
    expect(preencher('daqui a {n} dias', { n: 3 })).toBe('daqui a 3 dias');
  });
});
