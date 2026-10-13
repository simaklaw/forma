/**
 * FIT file header parser — mirrors packages/core/src/import/fit_header.ksy
 * (Kaitai Struct). Hand-maintained TS so CI does not need the KS compiler.
 */

import type { FitHeaderInfo } from './types.ts';

function u16le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32le(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

export function parseFitHeader(bytes: Uint8Array): FitHeaderInfo | null {
  if (bytes.length < 12) return null;
  const headerSize = bytes[0];
  if (headerSize < 12 || bytes.length < headerSize) return null;

  const dataType = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  const validMagic = dataType === '.FIT';

  const info: FitHeaderInfo = {
    headerSize,
    protocolVersion: bytes[1],
    profileVersion: u16le(bytes, 2),
    dataSize: u32le(bytes, 4),
    dataType,
    validMagic,
  };

  if (headerSize >= 14 && bytes.length >= 14) {
    info.headerCrc = u16le(bytes, 12);
  }

  return info;
}

/** Quick reject before full FIT decode. */
export function isFitFile(bytes: Uint8Array): boolean {
  const h = parseFitHeader(bytes);
  return h != null && h.validMagic;
}
