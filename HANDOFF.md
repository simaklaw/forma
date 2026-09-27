# HANDOFF — FitPulse / Forma

**Checkpoint:** 2026-09-27
**Branch in flight:** `feat/health-connect-phase3`
**APK:** do not build until owner says so.

## Done recently

- DeepSeek CR via OpenRouter (`sk-or-` auto-detect in `DEEPSEEK_API_KEY`)
- Health Connect phase 3 (this branch):
  - `nativeClient` dynamic require of `react-native-health-connect`
  - prefs + Profile `HealthConnectCard`
  - export on `completeDayIfDone`
  - minSdk 26 + HC permissions in `app.json`

## Tandem agents

See `docs/AGENT_TANDEM.md` — Grok orchestrates; Gemini / Free Claude Code optional co-reviewers; DeepSeek CR on every PR.

## Next

1. Merge phase 3 when CI green
2. Wire real kcal from WorkoutStats if available
3. Optional: weight write to HC
4. APK only when owner asks

## Rules

1. No APK without owner go-ahead.
2. No Google Fit.
3. Never commit API keys.
