# HANDOFF — FitPulse / Forma

**Checkpoint date:** 2026-09-26
**Active branch:** `main`
**Repo:** https://github.com/simaklaw/forma
**Product name:** FitPulse (mobile)
**APK:** do **not** build until owner says so.

---

## DeepSeek CR status

- Workflow: `.github/workflows/deepseek-review.yml`
- Secret name **must** be exactly `DEEPSEEK_API_KEY` (repository secret)
- Model: `deepseek-flash` (current DeepSeek API)
- Diagnostic steps: secret length + HTTP probe before review action
- If probe fails with `authentication_error` → key invalid/expired/wrong secret name

## Health Connect

Phase 1–2 on main (pure mappers + service stub).
Phase 3 next: native `react-native-health-connect`.

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Never commit API keys.
