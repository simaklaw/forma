/**
 * FIT decode for React Native — uses fit-file-parser on ArrayBuffer.
 * Header validated first via Kaitai-mirrored parseFitHeader from @forma/core.
 */

import {
  activitiesFromFitSessions,
  isFitFile,
  parseFitHeader,
  type FitSessionLike,
  type ImportParseResult,
} from '@forma/core';

// fit-file-parser is CJS; default import works under Metro.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FitParser = require('fit-file-parser').default ?? require('fit-file-parser');

export async function parseFitBytes(
  bytes: Uint8Array,
  opts: { idFactory: () => string; sourceFileName?: string },
): Promise<ImportParseResult> {
  const header = parseFitHeader(bytes);
  if (!header || !header.validMagic) {
    return { activities: [], warnings: ['Файл не похож на FIT (нет сигнатуры .FIT)'] };
  }

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  const data: {
    sessions?: FitSessionLike[];
    activity?: { sessions?: FitSessionLike[] };
  } = await new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      mode: 'list',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: false,
    });
    parser.parse(buffer, (error: string | null, result: unknown) => {
      if (error) reject(new Error(String(error)));
      else resolve(result as typeof data);
    });
  });

  const sessions: FitSessionLike[] =
    data.sessions ??
    data.activity?.sessions ??
    [];

  const mapped = activitiesFromFitSessions(sessions, opts);
  if (mapped.activities.length === 0) {
    mapped.warnings.push(
      `FIT header OK (profile ${header.profileVersion}, data ${header.dataSize} B), но session не найдены`,
    );
  }
  return mapped;
}

export { isFitFile, parseFitHeader };
