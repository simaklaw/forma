-- Persistent TTL cache for the Open Food Facts proxy
-- (apps/api/src/nutrition.ts + postgres.ts: PostgresNutritionCacheStore).
--
-- OFF product data is ODbL-licensed and shared by ALL users: there is no
-- per-user row here, so the RLS policy is intentionally permissive.
-- FORCE ROW LEVEL SECURITY still applies — the strict-RLS gate counts
-- every table — and this policy documents why the table is open.

CREATE TABLE nutrition.product_cache (
  barcode     text        PRIMARY KEY CHECK (barcode ~ '^[0-9]{8,14}$'),
  -- NULL = remembered "not found" (short TTL); JSON = found product.
  product     jsonb,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);

ALTER TABLE nutrition.product_cache FORCE ROW LEVEL SECURITY;

CREATE POLICY product_cache_public ON nutrition.product_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE nutrition.product_cache IS
  'Open Food Facts lookup cache (ODbL): shared public data, not per-user; permissive RLS by design.';
