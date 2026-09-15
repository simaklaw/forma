# EAS development client setup

## One-time (local, with Expo account)

From the monorepo root:

```bash
pnpm install
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` writes a real UUID into `app.json` → `expo.extra.eas.projectId`.
Commit that change (replace `REPLACE_WITH_EAS_PROJECT_ID`).

If the project already exists on expo.dev under slug `fitpulse-native`:

```bash
npx eas-cli@latest project:info
# copy Project ID into app.json extra.eas.projectId
```

## Rebuild

GitHub Actions → **EAS Build** → platform `android`, profile `development`.
Requires repository secret `EXPO_TOKEN`.

Or locally:

```bash
cd apps/mobile
npx eas-cli@latest build --platform android --profile development
```

## Notes

- `expo-dev-client` is required for the `development` profile (`developmentClient: true`).
- After lockfile changes: `pnpm install` at repo root and commit `pnpm-lock.yaml`.
