-- FitPulse P1 — allow 'unknown' device platform (follows 001_init.sql)
--
-- The sync wire contract (SyncPushOperation in @forma/sync-contract) has no
-- platform field, so ensureDevice() in apps/api/src/postgres.ts stores
-- 'unknown' for devices first seen via sync push. The original CHECK
-- (ios/android/web only) made every such first push fail with 23514
-- (found by the verify-sync E2E workflow).

ALTER TABLE platform.device DROP CONSTRAINT device_platform_check;

ALTER TABLE platform.device ADD CONSTRAINT device_platform_check
  CHECK (platform IN ('ios', 'android', 'web', 'unknown'));
