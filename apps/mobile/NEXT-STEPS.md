# NEXT-STEPS: что дальше по FORMA / FitPulse

Читать вместе с `HANDOFF.md`.

## 1. Где мы сейчас

Продуктовые заглушки и инженерные дыры, которые можно закрыть **без APK / без native dev client**, закрыты.

### Закрыто в последних проходах (ветка `fix/profile-gate-weightkg`)

- Profile gate: `weightKg` finite > 0, без default 70 kg
- Nutrition: ring remaining/over, banner при неполном профиле, FORMA eyebrow
- Workout: gym/home tabs, current-step highlight, session progress bar, player step chip
- Gym catalog: Push / Pull / Legs / **Full Body** (ids 22–24, без коллизии с 1–9)
- Coach / Progress: protein-aware, empty states, FORMA branding
- CI: typecheck + lint + test; `eslint-plugin-import` закреплён явно; зоны features включают coach/onboarding

### По-прежнему только на устройстве пользователя

- Metro / симулятор / реальный QA по `QA-CHECKLIST.md` (особенно rest timer через lock screen)
- APK — **только после вашего явного «собирай APK»** (план: сначала product-complete)

## 2. Решения

- Каталог: **локальный**, не wger как источник плана (фото техники с wger — ок)
- Нативка (MMKV / Skia / HealthKit / ExecuTorch): отложена до dev client

## 3. Открытые пункты (не блокируют playable MVP)

1. Ручной прогон `QA-CHECKLIST.md` на телефоне
2. Опционально: Upper/Lower split, мини-база статей (контент-домен)
3. Native modules — когда появится сборка dev client

## 4. Критерий «план выполнен → можно APK»

- [x] Profile gate строгий
- [x] Workout session sequential + UX текущего шага
- [x] Nutrition КБЖУ ring без фейковых targets
- [x] Coach / Progress осмысленные empty states
- [x] Gym + Home каталоги (PPL + Full Body / bodyweight days)
- [x] CI quality job с tests
- [ ] Ваш ручной QA на устройстве
- [ ] Явная команда собрать APK

После вашего QA и команды — EAS/workflow APK.
