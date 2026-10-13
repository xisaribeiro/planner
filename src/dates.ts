/**
 * Datas do planner. Tudo no fuso America/Sao_Paulo, com a semana começando no domingo.
 * Datas de calendário são textos 'AAAA-MM-DD' (sem hora), e a conta de dias usa UTC para
 * não sofrer com horário de verão ou com o fuso do aparelho.
 */
import { preencher, textos } from './strings';

export const FUSO = 'America/Sao_Paulo';

/** Texto no formato AAAA-MM-DD. */
export type Dia = string;

const formatadorSP = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export interface AgoraSP {
  dia: Dia;
  hora: number;
  minuto: number;
}

/** Data e hora de agora (ou de `instante`) como se vê em São Paulo. */
export function agoraSP(instante: Date = new Date()): AgoraSP {
  const partes: Record<string, string> = {};
  for (const p of formatadorSP.formatToParts(instante)) partes[p.type] = p.value;
  return {
    dia: `${partes['year']}-${partes['month']}-${partes['day']}`,
    hora: Number(partes['hour']),
    minuto: Number(partes['minute']),
  };
}

export function hojeSP(instante?: Date): Dia {
  return agoraSP(instante).dia;
}

function partes(dia: Dia): { ano: number; mes: number; dia: number } {
  const [a, m, d] = dia.split('-').map(Number);
  return { ano: a ?? 0, mes: m ?? 0, dia: d ?? 0 };
}

function ms(dia: Dia): number {
  const p = partes(dia);
  return Date.UTC(p.ano, p.mes - 1, p.dia);
}

function p2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function deMs(valor: number): Dia {
  const d = new Date(valor);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}

export function somarDias(dia: Dia, n: number): Dia {
  return deMs(ms(dia) + n * 86_400_000);
}

/** 0 é domingo, 6 é sábado. */
export function diaDaSemana(dia: Dia): number {
  return new Date(ms(dia)).getUTCDay();
}

/** O domingo da semana que contém `dia`. */
export function inicioDaSemana(dia: Dia): Dia {
  return somarDias(dia, -diaDaSemana(dia));
}

/** Quantos dias de `a` até `b` (positivo se `b` vem depois). */
export function diasEntre(a: Dia, b: Dia): number {
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}

/** 1 para 1º de janeiro. */
export function diaDoAno(dia: Dia): number {
  const p = partes(dia);
  return diasEntre(`${p.ano}-01-01`, dia) + 1;
}

export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function numeroDoDia(dia: Dia): number {
  return partes(dia).dia;
}

export function saudacao(hora: number): string {
  if (hora < 12) return textos.saudacao.manha;
  if (hora < 18) return textos.saudacao.tarde;
  return textos.saudacao.noite;
}

/** 'segunda-feira, 12 de outubro de 2026' */
export function dataPorExtenso(dia: Dia): string {
  const p = partes(dia);
  return preencher(textos.calendario.dataExtenso, {
    diaSemana: textos.calendario.diasLongo[diaDaSemana(dia)] ?? '',
    dia: p.dia,
    mes: textos.calendario.meses[p.mes - 1] ?? '',
    ano: p.ano,
  });
}

/** '11 a 17 de outubro', ou '28 de setembro a 4 de outubro' quando a semana cruza o mês. */
export function intervaloDaSemana(inicio: Dia): string {
  const a = partes(inicio);
  const b = partes(somarDias(inicio, 6));
  const meses = textos.calendario.meses;
  if (a.mes === b.mes) {
    return preencher(textos.calendario.intervaloMesmoMes, { a: a.dia, b: b.dia, mes: meses[b.mes - 1] ?? '' });
  }
  return preencher(textos.calendario.intervaloMesesDiferentes, {
    a: a.dia,
    mesA: meses[a.mes - 1] ?? '',
    b: b.dia,
    mesB: meses[b.mes - 1] ?? '',
  });
}

/** Contagem suave: hoje, amanhã, ontem, daqui a N dias, há N dias. */
export function contagem(dia: Dia, hoje: Dia): string {
  const n = diasEntre(hoje, dia);
  if (n === 0) return textos.contagem.hoje;
  if (n === 1) return textos.contagem.amanha;
  if (n === -1) return textos.contagem.ontem;
  return n > 1 ? preencher(textos.contagem.daquiA, { n }) : preencher(textos.contagem.ha, { n: -n });
}

/** Versão da aba Faculdade: hoje, amanhã, em N dias. */
export function contagemFaculdade(dia: Dia, hoje: Dia): string {
  const n = diasEntre(hoje, dia);
  if (n === 0) return textos.contagem.hoje;
  if (n === 1) return textos.contagem.amanha;
  return preencher(textos.contagem.em, { n });
}
