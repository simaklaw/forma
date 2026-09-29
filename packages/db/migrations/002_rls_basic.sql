-- FitPulse P1 — basic Row Level Security (architecture plan §4)
-- Apply after 001_init.sql
-- Dev note: API currently uses a bootstrap role; set app.current_user_id via SET LOCAL when wiring JWT.

-- Helper: current user from session GUC (set by API middleware later)
CREATE OR REPLACE FUNCTION platform.current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

ALTER TABLE platform.app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.device ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.client_operation ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.sync_change ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout.workout_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout.session_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout.session_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout.session_set ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout.exercise_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement.activity_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.food_entry ENABLE ROW LEVEL SECURITY;

-- Owner-only policies (skip when GUC unset so migrations/bootstrap still work as table owner)
CREATE POLICY app_user_self ON platform.app_user
  FOR ALL
  USING (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  )
  WITH CHECK (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  );

CREATE POLICY device_owner ON platform.device
  FOR ALL
  USING (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  )
  WITH CHECK (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  );

CREATE POLICY client_operation_owner ON platform.client_operation
  FOR ALL
  USING (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  )
  WITH CHECK (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  );

CREATE POLICY sync_change_owner ON platform.sync_change
  FOR ALL
  USING (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  )
  WITH CHECK (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  );

CREATE POLICY workout_session_owner ON workout.workout_session
  FOR ALL
  USING (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  )
  WITH CHECK (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  );

CREATE POLICY session_event_via_session ON workout.session_event
  FOR ALL
  USING (
    platform.current_user_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM workout.workout_session s
      WHERE s.session_id = session_event.session_id
        AND s.user_id = platform.current_user_id()
    )
  )
  WITH CHECK (
    platform.current_user_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM workout.workout_session s
      WHERE s.session_id = session_event.session_id
        AND s.user_id = platform.current_user_id()
    )
  );

CREATE POLICY exercise_record_owner ON workout.exercise_record
  FOR ALL
  USING (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  )
  WITH CHECK (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  );

CREATE POLICY activity_credit_owner ON engagement.activity_credit
  FOR ALL
  USING (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  )
  WITH CHECK (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  );

CREATE POLICY food_entry_owner ON nutrition.food_entry
  FOR ALL
  USING (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  )
  WITH CHECK (
    platform.current_user_id() IS NULL
    OR user_id = platform.current_user_id()
  );
