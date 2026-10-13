import { describe, expect, it } from 'vitest';
import { idPorChave, novoId, uuidV5 } from '../../src/ids';

describe('ids', () => {
  it('uuid v5 bate com o valor de referência da especificação', async () => {
    // uuid.uuid5(uuid.NAMESPACE_DNS, 'python.org')
    expect(await uuidV5('python.org', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe('886313e1-3b8a-5372-9b90-0c9aee199e5d');
  });

  it('a mesma chave dá sempre o mesmo id, e chaves diferentes dão ids diferentes', async () => {
    const a = await idPorChave('habit_checks', 'alimentacao|2026-10-12');
    const b = await idPorChave('habit_checks', 'alimentacao|2026-10-12');
    const c = await idPorChave('habit_checks', 'alimentacao|2026-10-13');
    const d = await idPorChave('important_checks', 'alimentacao|2026-10-12');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('ids novos são únicos', () => {
    expect(novoId()).not.toBe(novoId());
  });
});
