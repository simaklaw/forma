# HANDOFF — FitPulse

**Checkpoint:** 2026-09-29 (today CTA + FitPulse copy + projection stub)
**Brand:** FitPulse in UI/bundle. Packages may use `@forma/*` internally.
**APK:** do not build until owner says so.

## On main

1. P0 offline-first — #75
2. P1 sync skeleton → Postgres → HttpOutbox → App drain — #76–#79

## In flight

- `feat/workout-today-cta-fitpulse` — today's cycle day + Start above the fold; branding; projection stub

## Workout UX

- Tab **Тренировки** is initial route
- On focus: select `todayPlanDayId` (Mon-based rotation)
- Ticket with **Начать тренировку** is above the exercise list (no scroll needed)

## P1 status

| Item | Status |
|------|--------|
| DDL + RLS SQL | yes |
| Sync API + Postgres stores | yes |
| Client outbox + App drain | yes |
| Projection service (noop stub) | this branch |
| Real exercise_record / activity_credit writers | not started |
| Auth → RLS GUC | not started |

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse** — do not rename to Forma in UI/bundle.
3. No Google Fit — Health Connect only.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
