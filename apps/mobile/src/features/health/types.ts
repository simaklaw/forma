/** Platform-agnostic health sync types (Android Health Connect → Samsung Health; no Google Fit). */

export type HealthSyncStatus =
  | 'unsupported'
  | 'unavailable'
  | 'ready'
  | 'denied'
  | 'error';

/** Android Health Connect ExerciseSessionType.STRENGTH_TRAINING */
export const HC_EXERCISE_STRENGTH_TRAINING = 80;

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
  /** Health Connect ExerciseSessionType (default strength training). */
  exerciseType: number;
}

export interface HealthWeightSample {
  time: string;
  weightKg: number;
}
