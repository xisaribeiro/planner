/**
 * Todo texto que aparece para a Isabelle mora aqui.
 * Regras: português do Brasil, sem travessão e sem ponto e vírgula nos textos.
 * Um teste falha se algum texto deste arquivo ferir essas regras.
 * Textos com número usam marcadores como {n}, preenchidos por `preencher`.
 */
export const textos = {
  app: {
    nome: 'Planner',
    abas: 'Abas',
    pularParaConteudo: 'Pular para o conteúdo',
  },
  abas: {
    hoje: { rotulo: 'Hoje', titulo: 'Hoje', complemento: '' },
    faculdade: { rotulo: 'Faculdade', titulo: 'Faculdade', complemento: '' },
    metas: { rotulo: 'Metas', titulo: 'Metas', complemento: ' e hábitos' },
    wishlist: { rotulo: 'Wishlist', titulo: 'Wishlist', complemento: '' },
    repertorio: { rotulo: 'Repertório', titulo: 'Repertório', complemento: '' },
    cursos: { rotulo: 'Cursos', titulo: 'Cursos', complemento: '' },
  },
  tema: {
    alternar: 'Alternar modo claro e escuro',
  },
  provisorio: 'Esta aba chega nas próximas fases do planner.',
  saudacao: {
    manha: 'Bom dia',
    tarde: 'Boa tarde',
    noite: 'Boa noite',
  },
  calendario: {
    diasAbrev: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    diasCurto: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
    diasLongo: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
    meses: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    dataExtenso: '{diaSemana}, {dia} de {mes} de {ano}',
    intervaloMesmoMes: '{a} a {b} de {mes}',
    intervaloMesesDiferentes: '{a} de {mesA} a {b} de {mesB}',
  },
  contagem: {
    hoje: 'hoje',
    amanha: 'amanhã',
    ontem: 'ontem',
    daquiA: 'daqui a {n} dias',
    ha: 'há {n} dias',
    em: 'em {n} dias',
  },
} as const;

export function preencher(modelo: string, valores: Record<string, string | number>): string {
  return modelo.replace(/\{(\w+)\}/g, (_, chave: string) => String(valores[chave] ?? ''));
}
