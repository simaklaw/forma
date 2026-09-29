-- FitPulse P1 — STRICT Row Level Security (follows 002_rls_basic.sql)
--
-- 002 left a bypass in every policy: current_user_id() IS NULL OR ...
-- which meant "GUC unset => full access for any role". This migration
-- removes the bypass: with the GUC unset, non-superusers see NOTHING.
--
-- The API is expected to set app.current_user_id per transaction via
--   SELECT set_config('app.current_user_id', $user, true)
-- (see PostgresSyncUnitOfWork in apps/api/src/postgres.ts).
--
-- FORCE ROW LEVEL SECURITY makes even the table owner subject to the
-- policies. Superusers still bypass RLS, so migrations can be applied
-- with psql as the postgres superuser:
--   psql postgresql://postgres@localhost:5432/fitpulse -f 003_rls_strict.sql

BEGIN;

-- Drop the permissive policies from 002 -----------------------------------

DROP POLICY IF EXISTS app_user_self ON platform.app_user;
DROP POLICY IF EXISTS device_owner ON platform.device;
DROP POLICY IF EXISTS client_operation_owner ON platform.client_operation;
DROP POLICY IF EXISTS sync_change_owner ON platform.sync_change;
DROP POLICY IF EXISTS workout_session_owner ON workout.workout_session;
DROP POLICY IF EXISTS session_event_via_session ON workout.session_event;
DROP POLICY IF EXISTS exercise_record_owner ON workout.exercise_record;
DROP POLICY IF EXISTS activity_credit_owner ON engagement.activity_credit;
DROP POLICY IF EXISTS food_entry_owner ON nutrition.food_entry;

-- Strict owner-only policies (no GUC => deny) ------------------------------

CREATE POLICY app_user_self ON platform.app_user
  FOR ALL
  USING (user_id = platform.current_user_id())
  WITH CHECK (user_id = platform.current_user_id());

CREATE POLICY device_owner ON platform.device
  FOR ALL
  USING (user_id = platform.current_user_id())
  WITH CHECK (user_id = platform.current_user_id());

CREATE POLICY client_operation_owner ON platform.client_operation
  FOR ALL
  USING (user_id = platform.current_user_id())
  WITH CHECK (user_id = platform.current_user_id());

-- 002 enabled RLS on sync_change without any policy (deny-all even for
-- the legitimate owner). Add the missing owner policy here.
CREATE POLICY sync_change_owner ON platform.sync_change
  FOR ALL
  USING (user_id = platform.current_user_id())
  WITH CHECK (user_id = platform.current_user_id());

CREATE POLICY workout_session_owner ON workout.workout_session
  FOR ALL
  USING (user_id = platform.current_user_id())
  WITH CHECK (user_id = platform.current_user_id());

CREATE POLICY session_event_via_session ON workout.session_event
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workout.workout_session s
    WHERE s.session_id = session_event.session_id
      AND s.user_id = platform.current_user_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout.workout_session s
    WHERE s.session_id = session_event.session_id
      AND s.user_id = platform.current_user_id()
  ));

-- 002 also left session_step / session_set without policies.
CREATE POLICY session_step_via_session ON workout.session_step
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workout.workout_session s
    WHERE s.session_id = session_step.session_id
      AND s.user_id = platform.current_user_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout.workout_session s
    WHERE s.session_id = session_step.session_id
      AND s.user_id = platform.current_user_id()
  ));

CREATE POLICY session_set_via_step ON workout.session_set
  FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM workout.session_step st
    JOIN workout.workout_session s ON s.session_id = st.session_id
    WHERE st.session_step_id = session_set.session_step_id
      AND s.user_id = platform.current_user_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM workout.session_step st
    JOIN workout.workout_session s ON s.session_id = st.session_id
    WHERE st.session_step_id = session_set.session_step_id
      AND s.user_id = platform.current_user_id()
  ));

CREATE POLICY exercise_record_owner ON workout.exercise_record
  FOR ALL
  USING (user_id = platform.current_user_id())
  WITH CHECK (user_id = platform.current_user_id());

CREATE POLICY activity_credit_owner ON engagement.activity_credit
  FOR ALL
  USING (user_id = platform.current_user_id())
  WITH CHECK (user_id = platform.current_user_id());

CREATE POLICY food_entry_owner ON nutrition.food_entry
  FOR ALL
  USING (user_id = platform.current_user_id())
  WITH CHECK (user_id = platform.current_user_id());

-- Even the table owner must pass the policies -------------------------------

ALTER TABLE platform.app_user FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.device FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.client_operation FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.sync_change FORCE ROW LEVEL SECURITY;
ALTER TABLE workout.workout_session FORCE ROW LEVEL SECURITY;
ALTER TABLE workout.session_event FORCE ROW LEVEL SECURITY;
ALTER TABLE workout.session_step FORCE ROW LEVEL SECURITY;
ALTER TABLE workout.session_set FORCE ROW LEVEL SECURITY;
ALTER TABLE workout.exercise_record FORCE ROW LEVEL SECURITY;
ALTER TABLE engagement.activity_credit FORCE ROW LEVEL SECURITY;
ALTER TABLE nutrition.food_entry FORCE ROW LEVEL SECURITY;

COMMIT;
