# HANDOFF — FitPulse

**Checkpoint:** 2026-09-30 (OIDC: Mail.ru + VK ID)
**Brand:** FitPulse in UI/bundle.
**APK:** do not build until owner says so.

## Auth

- Email subject → JWT (`POST /api/v1/auth/register`) — works offline-first
- **OIDC:** `POST /api/v1/auth/oidc` with `provider: mailru | vk`
  - **No Google / Apple** (product decision for RU)
  - Mail.ru: JWKS at account.mail.ru, env `OIDC_MAILRU_CLIENT_ID`
  - VK ID: RSA public key, env `OIDC_VK_CLIENT_ID` + `OIDC_VK_PUBLIC_KEY` (PEM)

## Next

1. Green CI on feat/oidc-token-exchange
2. Optional: native VK ID / Mail.ru login UI (SDK or browser)
3. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse**.
3. No Google Fit — Health Connect only.
4. Frozen catalog exercise ids 1–30.
5. Profile gate: weightKg finite > 0.
6. No Google/Apple sign-in — Mail.ru / VK ID only.
