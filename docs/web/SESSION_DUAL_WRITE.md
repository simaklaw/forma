# Web session dual-write (Forma)

Web mirrors FitPulse mobile session rules via `@forma/workout-domain` + `WebMemorySessionRepository` (localStorage journal).

Zustand `session` is the UI projection; domain journal is the durable source of truth on cold start.

## Code map

| Concern | Location |
|---------|----------|
| Pure sequential helpers | `apps/web/src/lib/session-logic.ts` |
| Dual-write API | `apps/web/src/lib/workout-session/dualWrite.ts` |
| In-memory + localStorage repo | `apps/web/src/lib/workout-session/memoryRepo.ts` |
| Command service | `apps/web/src/lib/workout-session/sessionService.ts` |
| UI store | `apps/web/src/lib/store.ts` |
| Player | `apps/web/src/features/player.tsx` |
| Today resume card | `apps/web/src/features/today.tsx` |

## Behavioral parity (mobile)

| Scenario | Web behavior |
|----------|----------------|
| Same plan reopen | `domainStartPlan` resumes (`templateRevisionId`); UI hydrates `setsDone` / `exerciseIndex` / `restEndsAt` |
| Different plan | Previous session `abandoned` / `replaced_by_new_session` |
| Soft close (X) | Does **not** abandon; Today shows resume card |
| Заново | `domainRestartPlan` → `user_restarted` + fresh session |
| Sequential sets | `canMarkSet` + domain `currentStepIndex` |
| Rest skip | `domainSkipRest` |
| Rest after set | Domain `restEndsAtMs` (optimistic UI, then journal) |
| Auto-advance step | `exerciseIndex` follows `currentStepIndex` after mark |

## Manual smoke (browser)

| # | Step | Expected |
|---|------|----------|
| 1 | Start plan → mark 1 set → X → Today | Resume card with progress |
| 2 | Reload tab | Domain resume + UI hydrate (sets still counted) |
| 3 | Продолжить → rest overlay if mid-rest | Wall-clock from `restEndsAtMs` |
| 4 | Заново | Empty sets; old journal abandoned `user_restarted` |
| 5 | Start other plan mid-session | Previous abandoned |
| 6 | Mark sets out of order | Buttons disabled; banner + jump |
| 7 | Complete last set of exercise | Auto-jump to next exercise |
| 8 | Готово | Workout logged; resume card gone |

## Automated tests

```bash
pnpm --filter @forma/web test
```

Covers resume/abandon/restart, `uiSetsFromDomain`, `domainSkipRest`, `session-logic`.

## Out of scope (P1+)

- Cloud outbox / multi-device sync
- Auth user id (still `local-user`)
- SQLite on web (IndexedDB optional later)
