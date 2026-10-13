import type { BancoLocal } from './db';
import type { Sincronizador } from './sync';

/** O que cada aba recebe para trabalhar: o banco local e o sincronizador. */
export interface Contexto {
  banco: BancoLocal;
  sinc: Sincronizador;
}
