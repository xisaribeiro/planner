import { describe, expect, it } from 'vitest';
import {
  agoraSP,
  contagem,
  contagemFaculdade,
  dataPorExtenso,
  diaDaSemana,
  diaDoAno,
  diasEntre,
  inicioDaSemana,
  intervaloDaSemana,
  saudacao,
  somarDias,
  ultimoDiaDoMes,
} from '../../src/dates';

describe('fuso de São Paulo', () => {
  it('à 1h30 UTC ainda é noite do dia anterior em São Paulo', () => {
    const a = agoraSP(new Date('2026-10-13T01:30:00Z'));
    expect(a).toEqual({ dia: '2026-10-12', hora: 22, minuto: 30 });
  });

  it('ao meio-dia UTC é manhã em São Paulo', () => {
    const a = agoraSP(new Date('2026-10-13T12:05:00Z'));
    expect(a).toEqual({ dia: '2026-10-13', hora: 9, minuto: 5 });
  });

  it('meia-noite em São Paulo é hora 0 e não 24', () => {
    const a = agoraSP(new Date('2026-10-13T03:00:00Z'));
    expect(a.hora).toBe(0);
    expect(a.dia).toBe('2026-10-13');
  });
});

describe('saudação', () => {
  it('muda às 12h e às 18h', () => {
    expect(saudacao(0)).toBe('Bom dia');
    expect(saudacao(11)).toBe('Bom dia');
    expect(saudacao(12)).toBe('Boa tarde');
    expect(saudacao(17)).toBe('Boa tarde');
    expect(saudacao(18)).toBe('Boa noite');
    expect(saudacao(23)).toBe('Boa noite');
  });
});

describe('semana de domingo a sábado', () => {
  it('quarta 14/10 pertence à semana que começa no domingo 11/10', () => {
    expect(inicioDaSemana('2026-10-14')).toBe('2026-10-11');
  });
  it('domingo é o início da própria semana', () => {
    expect(inicioDaSemana('2026-10-11')).toBe('2026-10-11');
  });
  it('sábado ainda é da semana que começou no domingo', () => {
    expect(inicioDaSemana('2026-10-17')).toBe('2026-10-11');
  });
  it('cruza o mês e o ano', () => {
    expect(inicioDaSemana('2027-01-01')).toBe('2026-12-27');
  });
  it('dia da semana', () => {
    expect(diaDaSemana('2026-10-12')).toBe(1);
    expect(diaDaSemana('2026-10-11')).toBe(0);
  });
});

describe('contas de dias', () => {
  it('soma e subtrai atravessando mês e ano bissexto', () => {
    expect(somarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(somarDias('2027-01-01', -1)).toBe('2026-12-31');
  });
  it('não sofre com a mudança de horário de verão', () => {
    expect(diasEntre('2018-11-03', '2018-11-05')).toBe(2);
    expect(diasEntre('2019-02-15', '2019-02-18')).toBe(3);
  });
  it('diferença com sinal', () => {
    expect(diasEntre('2026-10-12', '2026-10-15')).toBe(3);
    expect(diasEntre('2026-10-15', '2026-10-12')).toBe(-3);
  });
  it('dia do ano', () => {
    expect(diaDoAno('2026-01-01')).toBe(1);
    expect(diaDoAno('2026-10-12')).toBe(285);
    expect(diaDoAno('2028-12-31')).toBe(366);
  });
  it('último dia do mês', () => {
    expect(ultimoDiaDoMes(2026, 2)).toBe(28);
    expect(ultimoDiaDoMes(2028, 2)).toBe(29);
    expect(ultimoDiaDoMes(2026, 11)).toBe(30);
  });
});

describe('textos de data', () => {
  it('data por extenso', () => {
    expect(dataPorExtenso('2026-10-12')).toBe('segunda-feira, 12 de outubro de 2026');
  });
  it('intervalo da semana no mesmo mês', () => {
    expect(intervaloDaSemana('2026-10-11')).toBe('11 a 17 de outubro');
  });
  it('intervalo da semana que cruza o mês', () => {
    expect(intervaloDaSemana('2026-09-27')).toBe('27 de setembro a 3 de outubro');
  });
  it('contagens suaves', () => {
    const hoje = '2026-10-12';
    expect(contagem('2026-10-12', hoje)).toBe('hoje');
    expect(contagem('2026-10-13', hoje)).toBe('amanhã');
    expect(contagem('2026-10-11', hoje)).toBe('ontem');
    expect(contagem('2026-10-17', hoje)).toBe('daqui a 5 dias');
    expect(contagem('2026-10-07', hoje)).toBe('há 5 dias');
  });
  it('contagem da Faculdade usa "em N dias"', () => {
    expect(contagemFaculdade('2026-10-12', '2026-10-12')).toBe('hoje');
    expect(contagemFaculdade('2026-10-13', '2026-10-12')).toBe('amanhã');
    expect(contagemFaculdade('2026-10-17', '2026-10-12')).toBe('em 5 dias');
  });
});
