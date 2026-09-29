-- FitPulse P1 — PostgreSQL domain schemas (architecture plan §4)
-- Apply with: psql $DATABASE_URL -f packages/db/migrations/001_init.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS workout;
CREATE SCHEMA IF NOT EXISTS nutrition;
CREATE SCHEMA IF NOT EXISTS engagement;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TYPE platform.user_status AS ENUM ('active', 'disabled', 'deleted');
CREATE TYPE platform.operation_status AS ENUM ('accepted', 'duplicate', 'rejected');
CREATE TYPE catalog.content_status AS ENUM ('draft', 'published', 'retired', 'withdrawn');
CREATE TYPE workout.template_scope AS ENUM ('system', 'user');
CREATE TYPE workout.session_status AS ENUM ('prepared', 'active', 'paused', 'completed', 'abandoned', 'voided');
CREATE TYPE workout.session_phase AS ENUM ('preflight', 'exercise', 'rest', 'paused', 'finishing', 'completed');
CREATE TYPE workout.step_status AS ENUM ('pending', 'active', 'completed', 'skipped');
CREATE TYPE workout.set_status AS ENUM ('pending', 'completed', 'skipped', 'reopened');
CREATE TYPE nutrition.entry_status AS ENUM ('active', 'deleted');

-- Identity
CREATE TABLE platform.app_user (
  user_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject   text NOT NULL UNIQUE,
  timezone       text NOT NULL DEFAULT 'UTC',
  locale         text NOT NULL DEFAULT 'ru-RU',
  status         platform.user_status NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform.device (
  device_id        uuid PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES platform.app_user(user_id),
  installation_id  uuid NOT NULL,
  platform         text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  app_version      text NOT NULL,
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, installation_id)
);

-- Versioned exercise catalog
CREATE TABLE catalog.exercise (
  exercise_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_slug  text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE catalog.exercise_revision (
  exercise_revision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id          uuid NOT NULL REFERENCES catalog.exercise(exercise_id),
  revision_no          integer NOT NULL CHECK (revision_no > 0),
  status               catalog.content_status NOT NULL DEFAULT 'draft',
  name                 text NOT NULL,
  muscle_groups        text[] NOT NULL DEFAULT '{}',
  instructions         jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_hash         char(64) NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  published_at         timestamptz,
  UNIQUE (exercise_id, revision_no),
  UNIQUE (exercise_id, content_hash)
);

CREATE TABLE catalog.exercise_media (
  media_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_revision_id uuid NOT NULL REFERENCES catalog.exercise_revision(exercise_revision_id),
  kind                 text NOT NULL CHECK (kind IN ('video', 'poster', 'audio_cue', 'animation')),
  uri                  text NOT NULL,
  sha256               char(64) NOT NULL,
  alt_text             text NOT NULL,
  sort_order           smallint NOT NULL DEFAULT 0,
  UNIQUE (exercise_revision_id, kind, uri)
);

-- Workout templates (immutable revisions)
CREATE TABLE workout.workout_template (
  template_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id  uuid REFERENCES platform.app_user(user_id),
  scope          workout.template_scope NOT NULL,
  title          text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  row_version    bigint NOT NULL DEFAULT 1
);

CREATE TABLE workout.workout_template_revision (
  template_revision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id          uuid NOT NULL REFERENCES workout.workout_template(template_id),
  version              integer NOT NULL CHECK (version > 0),
  status               catalog.content_status NOT NULL DEFAULT 'draft',
  title                text NOT NULL,
  estimated_seconds    integer NOT NULL CHECK (estimated_seconds > 0),
  content_hash         char(64) NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  published_at         timestamptz,
  UNIQUE (template_id, version)
);

CREATE TABLE workout.workout_step (
  template_revision_id uuid NOT NULL REFERENCES workout.workout_template_revision(template_revision_id),
  position             smallint NOT NULL CHECK (position > 0),
  exercise_revision_id uuid NOT NULL REFERENCES catalog.exercise_revision(exercise_revision_id),
  prescription         jsonb NOT NULL,
  rest_seconds         integer NOT NULL DEFAULT 0 CHECK (rest_seconds >= 0),
  PRIMARY KEY (template_revision_id, position)
);

-- Session aggregate
CREATE TABLE workout.workout_session (
  session_id           uuid PRIMARY KEY,
  user_id              uuid NOT NULL REFERENCES platform.app_user(user_id),
  created_by_device_id uuid NOT NULL REFERENCES platform.device(device_id),
  template_revision_id uuid NOT NULL REFERENCES workout.workout_template_revision(template_revision_id),
  status               workout.session_status NOT NULL DEFAULT 'prepared',
  phase                workout.session_phase NOT NULL DEFAULT 'preflight',
  local_start_date     date NOT NULL,
  timezone_at_start    text NOT NULL,
  client_started_at    timestamptz,
  server_started_at    timestamptz,
  ended_at             timestamptz,
  snapshot             jsonb NOT NULL,
  snapshot_hash        char(64) NOT NULL,
  last_event_ordinal   bigint NOT NULL DEFAULT 0,
  row_version          bigint NOT NULL DEFAULT 1,
  idempotency_key      uuid NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE UNIQUE INDEX workout_one_resumable_session_idx
  ON workout.workout_session (user_id)
  WHERE status IN ('prepared', 'active', 'paused');

CREATE TABLE workout.session_event (
  event_id               uuid PRIMARY KEY,
  session_id             uuid NOT NULL REFERENCES workout.workout_session(session_id),
  device_id              uuid NOT NULL REFERENCES platform.device(device_id),
  ordinal                bigint NOT NULL CHECK (ordinal > 0),
  event_type             text NOT NULL,
  payload_schema_version smallint NOT NULL DEFAULT 1,
  payload                jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at_client     timestamptz NOT NULL,
  received_at_server     timestamptz NOT NULL DEFAULT now(),
  correlation_id         uuid NOT NULL,
  UNIQUE (session_id, ordinal)
);

CREATE TABLE workout.session_step (
  session_step_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           uuid NOT NULL REFERENCES workout.workout_session(session_id),
  sequence_no          smallint NOT NULL CHECK (sequence_no > 0),
  exercise_revision_id uuid NOT NULL REFERENCES catalog.exercise_revision(exercise_revision_id),
  status               workout.step_status NOT NULL DEFAULT 'pending',
  skip_reason          text,
  completed_at         timestamptz,
  UNIQUE (session_id, sequence_no)
);

CREATE TABLE workout.session_set (
  session_set_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_step_id  uuid NOT NULL REFERENCES workout.session_step(session_step_id),
  set_no           smallint NOT NULL CHECK (set_no > 0),
  status           workout.set_status NOT NULL DEFAULT 'pending',
  repetitions      numeric(6,2),
  duration_seconds integer,
  load_kg          numeric(7,2),
  rpe              numeric(3,1),
  source_event_id  uuid REFERENCES workout.session_event(event_id),
  completed_at     timestamptz,
  UNIQUE (session_step_id, set_no)
);

-- Projections
CREATE TABLE workout.exercise_record (
  user_id              uuid NOT NULL REFERENCES platform.app_user(user_id),
  exercise_revision_id uuid NOT NULL REFERENCES catalog.exercise_revision(exercise_revision_id),
  record_kind          text NOT NULL CHECK (record_kind IN ('max_load', 'max_volume', 'max_reps')),
  value                numeric(12,3) NOT NULL,
  source_session_id    uuid NOT NULL REFERENCES workout.workout_session(session_id),
  achieved_at          timestamptz NOT NULL,
  PRIMARY KEY (user_id, exercise_revision_id, record_kind)
);

CREATE TABLE engagement.activity_credit (
  credit_id        uuid PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES platform.app_user(user_id),
  local_date       date NOT NULL,
  source_domain    text NOT NULL CHECK (source_domain IN ('workout', 'nutrition')),
  source_entity_id uuid NOT NULL,
  policy_version   integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_domain, source_entity_id, policy_version)
);

-- Nutrition (minimal shell for P1.5)
CREATE TABLE nutrition.food_entry (
  entry_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES platform.app_user(user_id),
  local_date   date NOT NULL,
  status       nutrition.entry_status NOT NULL DEFAULT 'active',
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_version  bigint NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Idempotency + sync feed
CREATE TABLE platform.client_operation (
  operation_id        uuid PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES platform.app_user(user_id),
  device_id           uuid NOT NULL REFERENCES platform.device(device_id),
  client_operation_id uuid NOT NULL,
  aggregate_type      text NOT NULL,
  aggregate_id        uuid NOT NULL,
  payload_hash        char(64) NOT NULL,
  status              platform.operation_status NOT NULL,
  result_body         jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id, client_operation_id)
);

CREATE TABLE platform.sync_change (
  change_id      bigserial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES platform.app_user(user_id),
  entity_type    text NOT NULL,
  entity_id      uuid NOT NULL,
  entity_version bigint NOT NULL,
  mutation       text NOT NULL CHECK (mutation IN ('upsert', 'tombstone')),
  payload        jsonb NOT NULL,
  committed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sync_change_pull_idx ON platform.sync_change (user_id, change_id);
