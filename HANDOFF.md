# HANDOFF — FitPulse

**Checkpoint:** 2026-09-30 (OIDC token exchange in progress)
**Brand:** FitPulse in UI/bundle.
**APK:** do not build until owner says so.

## Done

- P0 offline workout + P1 sync/RLS + P2 projections (soft PR → materialize)
- Email subject → JWT (`POST /api/v1/auth/register`)
- CI green on main (001–006)

## In flight — OIDC

- `POST /api/v1/auth/oidc` — Google/Apple ID token → app JWT
- Env: `OIDC_GOOGLE_CLIENT_ID`, `OIDC_APPLE_CLIENT_ID`
- Mobile: `exchangeOidcCredentials` (native Google/Apple UI next)

## Next

1. Finish OIDC (server tests + mobile Google via expo-auth-session)
2. Native Sign in with Google / Apple buttons
3. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse**.
3. No Google Fit — Health Connect only.
4. Frozen catalog exercise ids 1–30.
5. Profile gate: weightKg finite > 0.
