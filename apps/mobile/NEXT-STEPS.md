# NEXT-STEPS: что дальше по FORMA / FitPulse

Читать вместе с `HANDOFF.md`.

## 1. Где мы сейчас

Продуктовые заглушки и инженерные дыры, которые можно закрыть **без APK / без native dev client**, закрыты.

### Закрыто (ветка `fix/profile-gate-weightkg`)

- Profile gate: `weightKg` finite > 0, без default 70 kg; баннер на Профиле
- Nutrition: ring remaining/over, banner, FORMA eyebrow; **~40 offline RU presets**, до 24 в списке
- Workout: gym/home tabs, current-step highlight, session bar; **горизонтальный скролл дней**
- Gym catalog: Push / Pull / Legs / Full Body / **Upper / Lower** (ids 22–30)
- Coach / Progress: protein-aware, empty states, FORMA branding
- CI: typecheck + lint + test; `eslint-plugin-import`; зоны features + coach/onboarding

### Только на устройстве пользователя

- Metro / QA по `QA-CHECKLIST.md` (rest timer через lock screen)
- APK — **только после явного «собирай APK»**

## 2. Решения

- Каталог: локальный (фото техники с wger — ок)
- Нативка (MMKV / Skia / HealthKit / ExecuTorch): отложена до dev client

## 3. Открытые (не блокируют playable MVP)

1. Ручной прогон `QA-CHECKLIST.md`
2. Опционально: мини-база статей (контент-домен)
3. Native modules — с dev client

## 4. Критерий «план → APK»

- [x] Profile gate
- [x] Session + current step UX
- [x] Nutrition ring + offline presets
- [x] Coach / Progress empty states
- [x] Gym + Home (PPL + Full + Upper/Lower + bodyweight)
- [x] Day tabs scroll при многих днях
- [x] CI + eslint-plugin-import
- [ ] Ваш ручной QA
- [ ] Явная команда собрать APK
