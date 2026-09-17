# Web workout-session adapter

Bridges Forma web player to `@forma/workout-domain` (same aggregate as FitPulse mobile).

| Layer | Web | Mobile |
|-------|-----|--------|
| Domain | `@forma/workout-domain` | same |
| Persistence | memory + **localStorage** (`forma-workout-domain-v1`) | SQLite + memory |
| UI state | Zustand `session` (primary for player UX) | dual-write + projections |

## Behaviour

- `dualWrite.ts` records prepare/start/complete_set/complete|abandon **best-effort**.
- Domain is **sequential**; web player still allows free navigation.
- Player shows an amber hint when the open exercise ≠ domain `currentStepIndex`.
- Tests use `resetWebSessionForTests()` / `persist: false` so Node has no localStorage.

## CI note

After adding `@forma/workout-domain` to `apps/web/package.json`, run:

```bash
pnpm install
```

and commit the updated `pnpm-lock.yaml`.
