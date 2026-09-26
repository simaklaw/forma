# HANDOFF — FitPulse / Forma

**Checkpoint date:** 2026-09-26
**Active branch:** `main`
**Repo:** https://github.com/simaklaw/forma
**Product name:** FitPulse (mobile)
**APK:** do **not** build until owner says so.

---

## Where we stopped

### CI helpers

- **DeepSeek Code Review** workflow: `.github/workflows/deepseek-review.yml`
  - Secret required: `DEEPSEEK_API_KEY` (repo → Settings → Secrets and variables → Actions)
  - Runs on PR `opened` / `reopened` / `synchronize`
  - Skip: put `skip cr` or `skip review` in PR title or body

### Product

- Day plan overrides UX complete + focus reload
- Prettier gate includes `replaceTarget.ts`

### Next backlog

1. Health Connect — **only after owner OK** (owner deferred: after this CI helper)
2. ESLint monorepo gate
3. Prettier `reducer.ts` into gate
4. APK only when owner says so

---

## Rules

1. No APK without owner go-ahead.
2. No Google Fit. Health Connect only after owner green-light.
3. Preserve frozen catalog exercise ids **1–30**.
4. Update this file after each chunk.
5. Bump `PLAN_REVISION` when default static plans change.
6. Never commit API keys; only GitHub Actions secrets.
