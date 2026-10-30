# HANDOFF — FitPulse

**Checkpoint:** 2026-10-17 (Фазы 1–6 слиты: каталог/программы/двухязычность, темы light/dark/system, frozen-lockfile CI, фиксы кнопок; issue #155 — salvage дубль-репо)
**Brand:** FitPulse in UI/bundle.
**APK:** do not build until owner says so.

## Auth

- Email subject → JWT (`POST /api/v1/auth/register`)
- **OIDC:** `POST /api/v1/auth/oidc` — `provider: mailru | vk` (no Google/Apple)
- Mobile: `exchangeOidcCredentials` + SyncAccountCard buttons (VK ID / Mail.ru)
  - Env: `EXPO_PUBLIC_SYNC_API_URL`, `EXPO_PUBLIC_OIDC_VK_CLIENT_ID`, `EXPO_PUBLIC_OIDC_MAILRU_CLIENT_ID`
  - Redirect URI: `fitpulse://oauth` (register in provider consoles)

## Опровергнутые гипотезы (issue #155)

- «Массовый вылет `RangeError: weightKg must be a finite number greater than 0`» — **не воспроизводится** на текущем main: гейт `isProfileComplete` не рендерит RootNavigator без валидного профиля, в `WorkoutScreen`/`ExerciseSheet` стоят санитайзеры (`safeWeightKg`/`bodyKg`). Гипотеза из архитектурного заключения описывала старую версию кода. On-device проверка на свежем APK — добровольная (Actions → build-apk).

## Дубль-репозиторий (issue #155)

- `simaklaw/Forma-fitpulse-google` заморожен (README-баннер) и **готов к удалению владельцем**. Ценное перенесено в forma: генераторы бандловых MP4 → `scripts/exercise-videos/`; `docs/architecture` и `docs/mobile` уже были в forma. Остальное — устаревший снимок монорепо (npm workspaces, `@google/genai`) без ценности.

## Next

1. Register VK / Mail.ru apps, set client env, verify deep-link exchange on device
2. Optional: VK ID SDK + PKCE (more reliable than implicit token in browser)
3. Media-budget follow-up (#159): перематч кривых GIF-пар из аудита #155
4. APK only when owner says so

## Rules

1. No APK without owner go-ahead.
2. Brand is **FitPulse**.
3. No Google Fit — Health Connect only.
4. Frozen catalog exercise ids 1–30.
5. Profile gate: weightKg finite > 0.
6. No Google/Apple sign-in — Mail.ru / VK ID only.
