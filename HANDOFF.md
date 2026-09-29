# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-29
**APK:** do not build until owner says so.

## On main

1. SQLite migrations v1–v2 + weight snapshot (#66–#68)
2. Home mode, exercise media, coach keywords (#64)
3. Nutrition ring (#69)
4. Health Connect → Samsung Health + weight export (#71–#72)
5. Progress polish (#73)
6. Coach chips + onboarding a11y (#74)

## In flight

— none —

## Next (optional)

1. Session history list on Progress (completed workouts from SQLite)
2. Water quick-actions UX on Nutrition
3. **APK / EAS build only when owner says so**

## Rules

1. No APK without owner go-ahead.
2. No Google Fit — Health Connect only (Samsung Health syncs from HC).
3. Never commit API keys.
4. Preserve frozen catalog exercise ids 1–30.
5. Profile gate: `weightKg` finite > 0 — never invent default body mass.
