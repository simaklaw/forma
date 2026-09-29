/**
 * P1.3 — Projection hooks after accepted sync ops (architecture plan §1.3).
 * Memory/no-op by default; Postgres path can upsert exercise_record / activity_credit.
 */

export type ProjectionInput = {
  user_id: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
};

export interface ProjectionService {
  onAccepted(input: ProjectionInput): Promise<void>;
}

/** No-op — keeps push path free of DB writes beyond client_operation / sync_change. */
export class NoopProjectionService implements ProjectionService {
  async onAccepted(_input: ProjectionInput): Promise<void> {
    /* intentional */
  }
}

export const defaultProjectionService = new NoopProjectionService();
