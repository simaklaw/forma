# EAS development build

## One-time project linking

The Expo project ID is account-specific and must come from the Expo account that owns this application. From `apps/mobile`, run:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

If the project already exists, inspect it with:

```bash
npx eas-cli@latest project:info
```

`eas init` writes the real UUID to `expo.extra.eas.projectId` in `app.json`. Do not commit the placeholder or invent a UUID.

## Build locally

After linking the project:

```bash
cd apps/mobile
npx eas-cli@latest build --platform android --profile development
```

The `development` profile produces an installable Android APK with Expo Dev Client. The iOS variant targets the simulator.

## Build from GitHub Actions

Add the real `EXPO_TOKEN` as a repository secret, then run **Actions → EAS Build → Run workflow** and select `android` + `development`.

The mobile app can use the on-device Llama adapter when `EXPO_PUBLIC_LLAMA_MODEL_URL` points to a compatible GGUF artifact. Without that variable, or outside a native dev client, it safely uses the rules-based offline fallback.
