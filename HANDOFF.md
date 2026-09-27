# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-27
**Repo:** https://github.com/simaklaw/forma
**APK:** do not build until owner says so.

## DeepSeek CR

Workflow: `.github/workflows/deepseek-review.yml`

| Priority | Secret | Endpoint | Model |
|----------|--------|----------|-------|
| 1 | `OPENROUTER_API_KEY` | `https://openrouter.ai/api/v1` | `deepseek/deepseek-chat` |
| 2 | `DEEPSEEK_API_KEY` | `https://api.deepseek.com` | `deepseek-flash` |

- Official DeepSeek returned **402 Insufficient Balance** (key ok, no credit).
- **FreeDeepseekAPI** (ForgetMeAI) is a *local browser proxy* for chat.deepseek.com — not usable in GitHub Actions.
- Prefer OpenRouter for CI: Settings → Secrets → `OPENROUTER_API_KEY`.

## Health Connect

Phase 1–2 on main (pure mappers + service stub).
Phase 3 next: `react-native-health-connect` + Profile UI.

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Never commit API keys.
