-- FitPulse — optimistic concurrency: per-entity version heads (review #8).
--
-- platform.entity_head stores the current version of every synced entity
-- (user_id, entity_type, entity_id) -> current_version. Pushes carrying
-- expected_version bump conditionally (compare-and-increment, atomic in
-- the unit-of-work transaction); pushes without it bump unconditionally
-- (last-write-wins). Existing feed data is backfilled so OC clients see
-- versions consistent with platform.sync_change.

CREATE TABLE platform.entity_head (
  user_id         uuid NOT NULL REFERENCES platform.app_user(user_id),
  entity_type     text NOT NULL,
  entity_id       uuid NOT NULL,
  current_version bigint NOT NULL CHECK (current_version >= 1),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

-- Backfill from the change feed: newest version per entity.
INSERT INTO platform.entity_head (user_id, entity_type, entity_id, current_version)
SELECT user_id, entity_type, entity_id, max(entity_version)
FROM platform.sync_change
GROUP BY user_id, entity_type, entity_id;

-- Strict RLS, same pattern as 003: owner-only, deny without the GUC.
ALTER TABLE platform.entity_head ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_head_owner ON platform.entity_head
  FOR ALL
  USING (user_id = platform.current_user_id())
  WITH CHECK (user_id = platform.current_user_id());

ALTER TABLE platform.entity_head FORCE ROW LEVEL SECURITY;
