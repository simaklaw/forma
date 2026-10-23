import { contextHash, stableStringify } from './contextHash';

describe('stableStringify', () => {
  it('sorts object keys so key order does not matter', () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });

  it('keeps array order significant', () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });

  it('handles nested structures and primitives', () => {
    expect(stableStringify({ x: [{ y: 1 }] })).toBe('{"x":[{"y":1}]}');
    expect(stableStringify('s')).toBe('"s"');
    expect(stableStringify(undefined)).toBe('null');
  });
});

describe('contextHash', () => {
  it('is equal for equal data regardless of key order', () => {
    expect(contextHash({ meals: [], kcal: 100 })).toBe(contextHash({ kcal: 100, meals: [] }));
  });

  it('differs when data changes', () => {
    const base = { meals: [{ name: 'рис', kcal: 100 }] };
    const changed = { meals: [{ name: 'рис', kcal: 150 }] };
    expect(contextHash(base)).not.toBe(contextHash(changed));
  });
});
