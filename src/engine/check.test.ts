import { describe, expect, it } from 'vitest';
import { fingerprint, newSalt } from './check';

describe('fingerprint', () => {
  it('is the same for the same letters and salt, and different otherwise', async () => {
    const salt = 'pepper';
    expect(await fingerprint('OPENSESAME', salt)).toBe(await fingerprint('OPENSESAME', salt));
    expect(await fingerprint('OPENSESAME', salt)).not.toBe(await fingerprint('PEONSESAME', salt));
    expect(await fingerprint('OPENSESAME', salt)).not.toBe(await fingerprint('OPENSESAME', 'salt'));
    expect(await fingerprint('OPENSESAME', salt)).toMatch(/^[\w-]{22}$/);
  });
});

describe('newSalt', () => {
  it('is fresh every time', () => {
    const salts = new Set(Array.from({ length: 50 }, newSalt));
    expect(salts.size).toBe(50);
  });
});
