# HANDOFF — FitPulse

**Checkpoint:** 2026-10-01 (OIDC merged; mobile VK/Mail.ru UI)
**Brand:** FitPulse in UI/bundle.
**APK:** do not build until owner says so.

## Auth

- Email subject → JWT (`POST /api/v1/auth/register`)
- **OIDC:** `POST /api/v1/auth/oidc` — `provider: mailru | vk` (no Google/Apple)
- Mobile: `exchangeOidcCredentials` + SyncAccountCard buttons (VK ID / Mail.ru)
  - Env: `EXPO_PUBLIC_SYNC_API_URL`, `EXPO_PUBLIC_OIDC_VK_CLIENT_ID`, `EXPO_PUBLIC_OIDC_MAILRU_CLIENT_ID`
  - Redirect URI: `fitpulse://oauth` (register in provider consoles)

## Next

1. Register VK / Mail.ru apps, set client env, verify deep-link exchange on device
2. Optional: VK ID SDK + PKCE (more reliable than implicit token in browser)
3. Next product stage from architecture plan (post-P1 sync polish)
4. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse**.
3. No Google Fit — Health Connect only.
4. Frozen catalog exercise ids 1–30.
5. Profile gate: weightKg finite > 0.
6. No Google/Apple sign-in — Mail.ru / VK ID only.
