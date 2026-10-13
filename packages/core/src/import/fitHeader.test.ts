import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isFitFile, parseFitHeader } from './fitHeader.ts';

function makeHeader(dataSize = 0, headerSize = 14): Uint8Array {
  const b = new Uint8Array(headerSize);
  b[0] = headerSize;
  b[1] = 0x20;
  b[2] = 0x5c;
  b[3] = 0x08;
  b[4] = dataSize & 0xff;
  b[5] = (dataSize >> 8) & 0xff;
  b[6] = (dataSize >> 16) & 0xff;
  b[7] = (dataSize >> 24) & 0xff;
  b[8] = 0x2e;
  b[9] = 0x46;
  b[10] = 0x49;
  b[11] = 0x54;
  if (headerSize >= 14) {
    b[12] = 0;
    b[13] = 0;
  }
  return b;
}

describe('parseFitHeader', () => {
  it('accepts valid .FIT magic', () => {
    const h = parseFitHeader(makeHeader(100));
    assert.ok(h);
    assert.equal(h!.validMagic, true);
    assert.equal(h!.dataType, '.FIT');
    assert.equal(h!.dataSize, 100);
    assert.equal(h!.headerSize, 14);
  });

  it('rejects short buffer', () => {
    assert.equal(parseFitHeader(new Uint8Array(8)), null);
  });

  it('rejects wrong magic', () => {
    const b = makeHeader();
    b[8] = 0x41;
    const h = parseFitHeader(b);
    assert.ok(h);
    assert.equal(h!.validMagic, false);
    assert.equal(isFitFile(b), false);
  });

  it('isFitFile true for good header', () => {
    assert.equal(isFitFile(makeHeader()), true);
  });
});
