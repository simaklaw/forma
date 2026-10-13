/**
 * External activity import — watch / GPS files (FIT, TCX, GPX).
 * Separate from strength SetLogEntry (exerciseId + sets).
 */

export type ImportSourceFormat = 'fit' | 'tcx' | 'gpx';

export type ImportedSport =
  | 'running'
  | 'cycling'
  | 'walking'
  | 'hiking'
  | 'swimming'
  | 'strength'
  | 'cardio'
  | 'other';

export interface ImportedActivity {
  id: string;
  source: ImportSourceFormat;
  /** Original file name if known */
  sourceFileName?: string;
  dateKey: string;
  startedAtMs: number;
  durationSec: number;
  sport: ImportedSport;
  distanceM?: number;
  caloriesKcal?: number;
  avgHr?: number;
  maxHr?: number;
  name?: string;
}

export interface ImportParseResult {
  activities: ImportedActivity[];
  warnings: string[];
}

export interface FitHeaderInfo {
  headerSize: number;
  protocolVersion: number;
  profileVersion: number;
  dataSize: number;
  /** Always ".FIT" when valid */
  dataType: string;
  headerCrc?: number;
  validMagic: boolean;
}
