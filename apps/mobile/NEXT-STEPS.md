# NEXT-STEPS: что дальше по FORMA / FitPulse

Читать вместе с `HANDOFF.md`.

## 1. Где мы сейчас

Продуктовые заглушки и инженерные дыры, которые можно закрыть **без APK / без native dev client**, закрыты.

### Закрыто (ветка `fix/profile-gate-weightkg`)

- Profile gate: `weightKg` finite > 0, без default 70 kg
- **ProfileGateBanner** + `TabParamList` shared: Nutrition, Coach, Progress, WorkoutCoachCard CTA
- Nutrition: ring remaining/over; **~40 offline RU presets**
- Workout: gym/home, current-step, session bar, horizontal day tabs
- Gym: PPL + Full Body + Upper/Lower (ids 22–30)
- Coach chips expanded; ProtocolBanner FORMA polish
- **Daily tips** offline mini-base (`lib/dailyTips.ts`) на экране Прогресс
- CI: typecheck + lint + test; eslint-plugin-import

### Только на устройстве

- QA по `QA-CHECKLIST.md`
- APK — **только после явного «собирай APK»**

## 2. Решения

- Каталог локальный; нативка отложена до dev client

## 3. Открытые (не блокируют MVP)

1. Ручной QA
2. Native modules (dev client)

## 4. Критерий «план → APK»

- [x] Profile gate + shared gate CTA
- [x] Session + current step UX
- [x] Nutrition ring + offline presets
- [x] Coach / Progress empty states
- [x] Gym + Home catalogs
- [x] Day tabs scroll
- [x] Offline daily tips
- [x] CI
- [ ] Ваш ручной QA
- [ ] Явная команда собрать APK
