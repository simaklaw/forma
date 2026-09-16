# Device smoke: durable workout session (P0)

Run on a **development client** build (not Expo Go) so `expo-sqlite` is present.

## Preconditions

- EAS profile `development`, Android or iOS
- `expo-dev-client` installed
- `extra.eas.projectId` set in `app.json`
- Metro / app boots without redbox on SQLite open

## Checklist

| # | Step | Expected |
|---|------|----------|
| 1 | Open **Тренировка** → **Начать** on `legs` → log 1 set | Sheet shows set done; rest timer if `restSeconds > 0` |
| 2 | Force-quit app (swipe away), relaunch | **Продолжить** on same day; set still counted |
| 3 | Open same exercise | Rest timer hydrates from `restEndsAtMs` if still running |
| 4 | **Начать заново** | Old session `abandoned` / `user_restarted`; empty sets |
| 5 | Start `push` while `legs` was active | `legs` abandoned `replaced_by_new_session`; only `push` resumable |
| 6 | Complete all sets of a day | Session status `completed`; resume card gone |
| 7 | Kill mid-session → open Home/Progress | `dayProgress` / set counts match session (bootstrap hydrate) |

## Logs to watch

```
[FitPulse] SQLite session store failed…   # should NOT appear on real dev client
[FitPulse] session read-model hydrate failed
```

## Out of scope (P1)

- Cloud outbox drain
- Multi-device sync
- Auth user id (still `local-user`)
