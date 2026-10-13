/** Linhas das tabelas, com os mesmos nomes de coluna do banco. Datas de calendário são 'AAAA-MM-DD'. */
import type { Dia } from './dates';

export interface Comum {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at?: string;
}

export interface Configuracao extends Comum {
  course_name: string;
  institution_name: string;
  first_semester_code: string;
}

export interface Semestre extends Comum {
  code: string;
  starts_on: Dia | null;
  ends_on: Dia | null;
  pass_grade: number;
  closed_at: string | null;
}

export interface Materia extends Comum {
  semester_id: string;
  name: string;
  weekday: number;
  starts_at: string | null;
  ends_at: string | null;
  ends_on: Dia | null;
  ends_on_confirmed: boolean;
  absence_limit: number | null;
  absence_unit: number;
  prior_absences: number;
  grade_rule: Record<string, unknown>;
  rule_text: string;
}

export type TipoAvaliacao = 'prova' | 'seminario' | 'trabalho' | 'atividade';

export interface Avaliacao extends Comum {
  subject_id: string;
  kind: TipoAvaliacao;
  title: string;
  rule_key: string | null;
  due_on: Dia | null;
  date_confirmed: boolean;
  date_source: 'google' | 'manual';
  google_event_id: string | null;
  weight: number | null;
  points_max: number | null;
  grade: number | null;
  done: boolean;
  condition_text: string | null;
}

export interface Falta extends Comum {
  subject_id: string;
  on_date: Dia;
}

export interface Afazer extends Comum {
  week_start: Dia;
  position: number;
  text: string;
  done: boolean;
  carried: boolean;
}

export interface CheckImportante extends Comum {
  item_key: string;
  on_date: Dia;
  done: boolean;
}

export interface Vencimento extends Comum {
  name: string;
  day_of_month: number;
}

export interface SemanaDeRespiro extends Comum {
  week_start: Dia;
}

export type AreaDaMeta = 'carreira' | 'financas' | 'saude' | 'relacoes' | 'lazer' | 'desenvolvimento';

export interface Meta extends Comum {
  area: AreaDaMeta;
  name: string;
  kind: 'habits' | 'count';
  target: number | null;
  progress: number;
  unit: string | null;
  due_on: Dia | null;
  focus_period: string | null;
  archived: boolean;
  auto_source: string | null;
}

export type TipoDeHabito = 'daily' | 'weekly_quota' | 'weekdays' | 'monthly' | 'optional';

export interface Habito extends Comum {
  habit_key: string;
  goal_id: string | null;
  group_label: string | null;
  color: string | null;
  name: string;
  subtitle: string | null;
  kind: TipoDeHabito;
  quota: number | null;
  weekdays: number[] | null;
  auto_source: string | null;
  valid_from: Dia;
  valid_to: Dia | null;
  position: number;
}

export interface CheckDeHabito extends Comum {
  habit_key: string;
  on_date: Dia;
  done: boolean;
  source: 'manual' | 'auto';
}

export interface Desejo extends Comum {
  name: string;
  avg_price: number | null;
  priority: 'alta' | 'media' | 'baixa';
  bought_on: Dia | null;
  paid_price: number | null;
}

export interface ItemDoRepertorio extends Comum {
  category: 'livro' | 'filme' | 'serie';
  title: string;
  author: string | null;
  status: 'quero' | 'andamento' | 'feito';
  started_on: Dia | null;
  finished_on: Dia | null;
  rating: number | null;
  summary: string | null;
  favorite: boolean;
}

export interface Curso extends Comum {
  name: string;
  position: number;
  site_url: string | null;
  description: string | null;
}

export interface ModuloDeCurso extends Comum {
  course_id: string;
  position: number;
  number: number | null;
  title: string;
}

export interface BlocoDeCurso extends Comum {
  module_id: string;
  position: number;
  title: string | null;
  minutes: number | null;
}

export interface AulaDeCurso extends Comum {
  block_id: string;
  position: number;
  title: string;
  kind: string | null;
  url: string | null;
  seconds: number | null;
  done_on: Dia | null;
}

/** Nome da tabela no banco para o tipo da linha. */
export interface MapaDeTabelas {
  settings: Configuracao;
  semesters: Semestre;
  subjects: Materia;
  assessments: Avaliacao;
  absences: Falta;
  todos: Afazer;
  important_checks: CheckImportante;
  recurring_dues: Vencimento;
  rest_weeks: SemanaDeRespiro;
  goals: Meta;
  habits: Habito;
  habit_checks: CheckDeHabito;
  wishes: Desejo;
  media_items: ItemDoRepertorio;
  courses: Curso;
  course_modules: ModuloDeCurso;
  course_blocks: BlocoDeCurso;
  course_lessons: AulaDeCurso;
}

export type Tabela = keyof MapaDeTabelas;

/** Ordem de envio: pais antes dos filhos, por causa das chaves estrangeiras. */
export const TABELAS: readonly Tabela[] = [
  'settings',
  'semesters',
  'subjects',
  'assessments',
  'absences',
  'todos',
  'important_checks',
  'recurring_dues',
  'rest_weeks',
  'goals',
  'habits',
  'habit_checks',
  'wishes',
  'media_items',
  'courses',
  'course_modules',
  'course_blocks',
  'course_lessons',
] as const;
