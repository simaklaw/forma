# HANDOFF — FitPulse / Forma

**Checkpoint date:** 2026-09-26
**Active branch:** `main`
**Repo:** https://github.com/simaklaw/forma
**Product name:** FitPulse (mobile)
**APK:** do **not** build until owner says so.

---

## Where we stopped (done recently)

### PLAN_REVISION (2026-09-26)

- `PLAN_REVISION = '2026-09-26.1'` in `planToSnapshots.ts`
- `templateRevisionId` = `day-{id}@{PLAN_REVISION}`
- `exerciseRevisionId` / `contentHash` include revision
- `dayIdFromTemplate` still accepts legacy `day-{id}`

### Catalog UX

- Equipment chips, detail modal, favorites, **recent** row
- Prettier progressive CI gate (`format:check:gate`)

### Earlier

- Rest between exercises, catalog integrity (ids 1–30), outbox prune, calves, light theme

---

## Next backlog

1. Expand Prettier gate to `packages/**` and rest of mobile (full `pnpm format`)
2. Optional: replace exercise in today’s day plan from catalog
3. Optional: real technique video assets (generated)
4. Health Connect module (not Google Fit) when health sync is in scope
5. ESLint monorepo gate / shared logger
6. APK only when owner says so

---

## Architecture: Health Connect only

Google Fit **rejected**. Offline-first session remains source of truth.

---

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Preserve exercise ids **1–30**.
4. Update this file after each chunk.
5. Bump `PLAN_REVISION` when default plans change targets/structure.
