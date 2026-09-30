-- System catalog + template seed so accepted sync ops can materialize
-- workout.workout_session and promote soft PRs into workout.exercise_record.
-- Fixed UUIDs (hex only): stable across environments, safe to re-run.

INSERT INTO workout.workout_template (template_id, owner_user_id, scope, title)
VALUES (
  '00000000-0000-4000-8000-00000000f001'::uuid,
  NULL,
  'system',
  'FitPulse sync materialize'
)
ON CONFLICT (template_id) DO NOTHING;

INSERT INTO workout.workout_template_revision (
  template_revision_id,
  template_id,
  version,
  status,
  title,
  estimated_seconds,
  content_hash,
  published_at
) VALUES (
  '00000000-0000-4000-8000-00000000f002'::uuid,
  '00000000-0000-4000-8000-00000000f001'::uuid,
  1,
  'published',
  'FitPulse sync materialize v1',
  1800,
  repeat('a', 64),
  now()
)
ON CONFLICT (template_revision_id) DO NOTHING;

-- Exercises 1–30 (frozen catalog ids) → revision ids.
DO $$
DECLARE
  i int;
  eid uuid;
  rid uuid;
  slug text;
BEGIN
  FOR i IN 1..30 LOOP
    eid := ('10000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    rid := ('11000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    slug := 'catalog-ex-' || i::text;
    INSERT INTO catalog.exercise (exercise_id, canonical_slug)
    VALUES (eid, slug)
    ON CONFLICT (canonical_slug) DO NOTHING;

    INSERT INTO catalog.exercise_revision (
      exercise_revision_id,
      exercise_id,
      revision_no,
      status,
      name,
      muscle_groups,
      instructions,
      content_hash,
      published_at
    )
    SELECT
      rid,
      e.exercise_id,
      1,
      'published',
      'Exercise ' || i::text,
      ARRAY[]::text[],
      '[]'::jsonb,
      repeat(md5(i::text), 2),
      now()
    FROM catalog.exercise e
    WHERE e.canonical_slug = slug
    ON CONFLICT (exercise_revision_id) DO NOTHING;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS catalog.exercise_key_map (
  exercise_key         text PRIMARY KEY,
  exercise_revision_id uuid NOT NULL REFERENCES catalog.exercise_revision(exercise_revision_id)
);

INSERT INTO catalog.exercise_key_map (exercise_key, exercise_revision_id)
SELECT i::text, ('11000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid
FROM generate_series(1, 30) AS s(i)
ON CONFLICT (exercise_key) DO NOTHING;
