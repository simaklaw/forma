# Workout session data layer (P0-C)

Offline-first persistence for `@forma/workout-domain`.

## Flow

```
UI / player
  → SessionCommandService.dispatch(command)
    → applyCommand (pure reducer in @forma/workout-domain)
    → SessionRepository.commitSessionChange (session + events + outbox)
```

## Implementations

| Repo | When |
|------|------|
| `MemorySessionRepository` | Jest, default bootstrap |
| `SqliteSessionRepository` | Device / EAS via `expo-sqlite` |

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

Until this runs, `getSessionService()` uses memory (data lost on process kill).

## Outbox

Each accepted event is written to `outbox` with `status=pending` for future P1 sync. No network yet.

## Not in this layer

- WorkoutScreen UI wiring (next)
- Migration of legacy Zustand `setLogs`
- Server push/pull
