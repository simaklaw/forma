# HANDOFF — FitPulse

**Checkpoint:** 2026-09-29
**Brand:** FitPulse (not Forma rebrand). Packages may still use `@forma/*` internally.
**APK:** do not build until owner says so.

## On main

1. SQLite migrations + weight snapshot, home mode, media, coach, nutrition, HC/Samsung
2. Progress / coach-onboarding polish (#73–#74)

## In flight

- `feat/p0-early-leave` — P0 Early Leave (pause / finish partial / abandon) + wall-clock rest test

## P0 status (FitPulse mobile)

| Item | Status |
|------|--------|
| Brand FitPulse | yes (`app.fitpulse.*`) |
| workout-domain + SQLite + outbox | yes |
| Session snapshot / weightKgSnapshot | yes |
| Wall-clock RestTimerEngine + AppState | yes |
| Early Leave (pause / save / abandon) | this PR |
| PostgreSQL / sync (P1) | not started |

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse** — do not rename to Forma in UI/bundle.
3. No Google Fit — Health Connect only.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
