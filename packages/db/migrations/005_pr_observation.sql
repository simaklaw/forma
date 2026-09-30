-- Soft personal-record observations.
-- No FK to catalog.exercise_revision or workout.workout_session — those need
-- catalog seed + server-side session materialization. Promote later by
-- mapping exercise_key → exercise_revision_id and inserting into exercise_record.

CREATE TABLE IF NOT EXISTS workout.pr_observation (
  user_id           uuid NOT NULL REFERENCES platform.app_user(user_id),
  exercise_key      text NOT NULL,
  record_kind       text NOT NULL CHECK (record_kind IN ('max_load', 'max_volume', 'max_reps')),
  value             numeric(12,3) NOT NULL,
  source_session_id uuid NOT NULL,
  achieved_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exercise_key, record_kind)
);

ALTER TABLE workout.pr_observation ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout.pr_observation FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pr_observation_owner ON workout.pr_observation;
CREATE POLICY pr_observation_owner ON workout.pr_observation
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);
