import { uuidv7 } from './ids';

describe('uuidv7', () => {
  it('matches UUID string shape and version/variant nibble', () => {
    const id = uuidv7(1_700_000_000_000);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('is lexicographically sortable by timestamp (monotonic time order)', () => {
    const fixedRand = new Uint8Array(10).fill(0x11);
    const a = uuidv7(1_700_000_000_000, fixedRand);
    const b = uuidv7(1_700_000_000_001, fixedRand);
    const c = uuidv7(1_800_000_000_000, fixedRand);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
    const sorted = [c, a, b].sort();
    expect(sorted).toEqual([a, b, c]);
  });

  it('produces unique ids under same millisecond with different rand', () => {
    const t = 1_700_000_000_000;
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const r = new Uint8Array(10);
      r[0] = i;
      r[1] = i * 3;
      set.add(uuidv7(t, r));
    }
    expect(set.size).toBe(50);
  });
});
