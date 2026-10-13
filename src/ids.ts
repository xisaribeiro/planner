/** Identificadores. Linhas comuns usam UUID v4 gerado no aparelho. Linhas de chave natural usam UUID v5. */

export function novoId(): string {
  return crypto.randomUUID();
}

const NAMESPACE_PLANNER = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function bytesDoUuid(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function uuidDosBytes(b: Uint8Array): string {
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** UUID v5 (SHA-1). Mesmo nome e mesmo namespace dão sempre o mesmo id, em qualquer aparelho. */
export async function uuidV5(nome: string, namespace: string = NAMESPACE_PLANNER): Promise<string> {
  const ns = bytesDoUuid(namespace);
  const texto = new TextEncoder().encode(nome);
  const entrada = new Uint8Array(ns.length + texto.length);
  entrada.set(ns, 0);
  entrada.set(texto, ns.length);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', entrada));
  const b = hash.slice(0, 16);
  b[6] = (b[6]! & 0x0f) | 0x50;
  b[8] = (b[8]! & 0x3f) | 0x80;
  return uuidDosBytes(b);
}

/**
 * Id estável para linhas que têm chave natural (um check por hábito e dia, uma semana de respiro...).
 * Dois aparelhos que marcam a mesma coisa offline chegam ao mesmo id, então não há conflito de duplicata.
 */
export function idPorChave(tabela: string, chave: string): Promise<string> {
  return uuidV5(`${tabela}|${chave}`);
}
