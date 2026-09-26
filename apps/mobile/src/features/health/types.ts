/** Platform-agnostic health sync types (Android Health Connect; no Google Fit). */

export type HealthSyncStatus =
  | 'unsupported'
  | 'unavailable'
  | 'ready'
  | 'denied'
  | 'error';

export interface HealthWorkoutExport {
  /** ISO-8601 start */
  startTime: string;
  /** ISO-8601 end */
  endTime: string;
  /** Active energy in kilocalories */
  activeCaloriesKcal: number;
  /** Human-readable title for the session */
  title: string;
  /** FitPulse session id for idempotent clientRecordId */
  sessionId: string;
}

export interface HealthWeightSample {
  time: string;
  weightKg: number;
}
