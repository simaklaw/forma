# HANDOFF — FitPulse / Forma

**Checkpoint date:** 2026-09-26
**Active branch:** `main`
**Repo:** https://github.com/simaklaw/forma
**Product name:** FitPulse (mobile)
**APK:** do **not** build until owner says so.

---

## Where we stopped

### DeepSeek CR

- Workflow: `.github/workflows/deepseek-review.yml`
- Secret: `DEEPSEEK_API_KEY`
- Smoke PR #50: monorepo CI green; DeepSeek job failed (likely exclude-patterns YAML) — config simplified on `fix/deepseek-cr-robust`

### Health Connect (in progress)

Phase 1 on main: pure mappers + tests (`features/health/`).
Phase 2 (this branch): `HealthConnectService` stub (Android-only status).
Phase 3 next: `react-native-health-connect` + app.json permissions (minSdk 26) + Profile UI + write on session complete.

**No Google Fit.**

### Next backlog

1. Finish Health Connect native write path
2. ESLint monorepo gate
3. Prettier reducer into gate
4. APK only when owner says so

---

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Frozen catalog ids 1–30.
4. Never commit API keys.
