# Mail.ru Android E2E

The repository is wired for Mail.ru authorization-code + PKCE.

## Production configuration

### GitHub repository Variables

Set these in **Settings → Secrets and variables → Actions → Variables**:

- `EXPO_PUBLIC_OIDC_MAILRU_CLIENT_ID`
- `EXPO_PUBLIC_SYNC_API_URL` — HTTPS URL of the deployed API

These values are public client configuration. Expo documents that `EXPO_PUBLIC_` values are embedded into the application bundle, so they must never contain secrets.

### API host

Set these on the server running `@forma/api`:

```text
OIDC_MAILRU_CLIENT_ID=<client id>
OIDC_MAILRU_CLIENT_SECRET=<server-only secret>
JWT_SECRET=<long random secret>
```

Never put `OIDC_MAILRU_CLIENT_SECRET` into Expo, `EXPO_PUBLIC_*`, git, or GitHub Variables.

### Mail.ru application

Configure exactly:

```text
fitpulse://oauth
```

as the redirect URI.

## Android APK

Push to `main`. The **Build Android APK** workflow reads the two GitHub Variables, validates them, runs the native Android release build, verifies that the JS bundle is embedded, and uploads the APK artifact.

## Real-device flow

1. Install the generated APK.
2. Open **Account → Mail.ru**.
3. Complete Mail.ru login.
4. Mail.ru redirects to `fitpulse://oauth?code=...&state=...`.
5. The app validates the pending state and sends the code + PKCE verifier to the API.
6. The API exchanges the code with Mail.ru using its server-only client secret.
7. The API verifies the returned ID token and returns the FitPulse JWT.
8. Perform a sync operation and confirm it succeeds.

## API-leg smoke test

If you have a captured authorization code and its verifier, you can test the server exchange without the app:

```bash
MAILRU_E2E_API_URL=https://api.example.com \
MAILRU_E2E_CODE='...' \
MAILRU_E2E_CODE_VERIFIER='...' \
node scripts/mailru-e2e.mjs
```

Do not paste the client secret, verifier, authorization code, access token or ID token into commits, issues or chat.
