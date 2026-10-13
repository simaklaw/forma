import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  parseGpx,
  parseTcx,
  type ImportParseResult,
  type ImportedActivity,
} from '@forma/core';
import { uuidv7 } from '@/features/workout/data/ids';
import { parseFitBytes } from './parseFitFile';

function extOf(name: string | undefined): string {
  if (!name) return '';
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

async function readAsUtf8(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
}

async function readAsBytes(uri: string): Promise<Uint8Array> {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type ActivityImportOutcome = {
  activities: ImportedActivity[];
  warnings: string[];
  cancelled: boolean;
  fileName?: string;
};

/** Opens system document picker and parses FIT / TCX / GPX. */
export async function pickAndParseActivityFile(): Promise<ActivityImportOutcome> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.ant.fit',
      'application/fit',
      'application/gpx+xml',
      'application/vnd.garmin.tcx+xml',
      'application/xml',
      'text/xml',
      '*/*',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || !picked.assets?.length) {
    return { activities: [], warnings: [], cancelled: true };
  }

  const asset = picked.assets[0];
  const fileName = asset.name ?? 'activity';
  const ext = extOf(fileName);
  const idFactory = () => uuidv7();

  try {
    if (ext === 'fit') {
      const bytes = await readAsBytes(asset.uri);
      const r = await parseFitBytes(bytes, { idFactory, sourceFileName: fileName });
      return { ...r, cancelled: false, fileName };
    }

    const text = await readAsUtf8(asset.uri);
    let r: ImportParseResult;
    if (ext === 'gpx' || text.includes('<gpx')) {
      r = parseGpx(text, { idFactory, sourceFileName: fileName });
    } else if (ext === 'tcx' || text.includes('TrainingCenterDatabase')) {
      r = parseTcx(text, { idFactory, sourceFileName: fileName });
    } else {
      return {
        activities: [],
        warnings: [`Неизвестный формат «${ext || fileName}». Поддерживаются .fit, .tcx, .gpx`],
        cancelled: false,
        fileName,
      };
    }
    return { ...r, cancelled: false, fileName };
  } catch (err) {
    return {
      activities: [],
      warnings: [err instanceof Error ? err.message : String(err)],
      cancelled: false,
      fileName,
    };
  }
}
