# Workout session data layer (P0-C)

Offline-first persistence for `@forma/workout-domain`.

## Flow

```
UI / player
  → SessionCommandService.dispatch(command)
    → applyCommand (pure reducer in @forma/workout-domain)
    → SessionRepository.commitSessionChange (session + events + outbox)
```

Recovery in P0 reads the materialised `aggregate_json` column, not event-log replay.
Full journal replay is **not** a public API of `@forma/workout-domain` in P0 (see TODO P1).

## Implementations

| Repo | When |
|------|------|
| `MemorySessionRepository` | Jest, default bootstrap |
| `SqliteSessionRepository` | Device / EAS via `expo-sqlite` |

## Testing (honest scope)

| Suite | Engine |
|-------|--------|
| `SessionRepository.contract.test.ts` | **Memory only** |
| `SqliteSessionRepository.txn.test.ts` | **Fake in-memory DB** (records BEGIN/COMMIT; does **not** execute real SQLite DDL) |

**Known gap:** partial unique index and `UNIQUE (session_id, ordinal)` are **not** exercised against a real SQLite / `expo-sqlite` binary in CI. Validate on device or EAS development client. Do not treat the fake-DB test as proof that DDL is valid on-device.

## Bootstrap (native)

```ts
import * as SQLite from 'expo-sqlite';
import {
  configureSessionPersistence,
  WORKOUT_DB_NAME,
} from '@/features/workout/data';

configureSessionPersistence(
  'sqlite',
  SQLite.openDatabaseSync(WORKOUT_DB_NAME)
);
```

`App.tsx` attempts this on iOS/Android. On failure it logs an **explicit warning** and keeps a **non-blocking memory fallback** (not hard fail-fast). Sessions then do not survive process death.

## Outbox

Each accepted event is written to `outbox` with `status=pending` for future P1 sync. No network yet.

## Legacy read-model projection

Accepted `set_completed` events are projected by `sessionProjections.ts` into the
legacy Zustand `setLogs` and `dayProgress` shapes used by workout, analytics and
coach screens. Projection is idempotent by event ID and uses the session's
`localStartDate` as the local day key. New workout writes go through the durable
session command first; the legacy store is updated only from the accepted event
journal. Existing legacy logs remain supported for backwards-compatible reads.

## Not in this layer

- Server push/pull
- Full event-sourced rebuild from journal
