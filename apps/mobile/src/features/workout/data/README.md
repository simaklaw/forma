# Workout session data layer (P0-C / P1 sync client)

Offline-first persistence for `@forma/workout-domain`.

## Flow

```
UI / player
  → SessionCommandService.dispatch(command)
    → applyCommand (pure reducer in @forma/workout-domain)
    → SessionRepository.commitSessionChange (session + events + outbox)
```

Recovery in P0 reads the materialised `aggregate_json` column, not event-log replay.

## Implementations

| Repo | When |
|------|------|
| `MemorySessionRepository` | Jest, default bootstrap |
| `SqliteSessionRepository` | Device / EAS via `expo-sqlite` |

## Outbox → sync API (P1)

Each accepted event is written to `outbox` with `status=pending`.

```ts
import {
  OutboxDrainService,
  createHttpOutboxTransportFromEnv,
  noopOutboxTransport,
} from '@/features/workout/data';

const transport =
  createHttpOutboxTransportFromEnv() ?? noopOutboxTransport;
const drain = new OutboxDrainService(transport);
await drain.drainOnce(20);
```

Set `EXPO_PUBLIC_SYNC_API_URL` (e.g. `http://10.0.2.2:8787` on Android emulator).
Until auth lands, `local-user` is mapped to a fixed UUID for the API.

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

## Legacy read-model projection

Accepted `set_completed` events are projected by `sessionProjections.ts` into the
legacy Zustand `setLogs` / `dayProgress` shapes.

## Not in this layer yet

- Full event-sourced rebuild from journal
- Auth-bound user_id (still placeholder)
- Background TaskManager drain schedule
