# FitPulse (React Native / Expo)

Нативная пересборка прототипа [`web-prototype/fitpulse-redesign.html`](./web-prototype/fitpulse-redesign.html)
по архитектурному отчёту (React Native + Expo + Zustand + AsyncStorage +
wger/Open Food Facts API). Полный список того, что реально работает, что
портировано частично и что осознанно не перенесено — в [`HANDOFF.md`](./HANDOFF.md).
Прочитайте его перед тем, как продолжать разработку — это избавит от
повторного открытия уже закрытых вопросов.

## Быстрый старт

```bash
npm install
npx expo start
```

Откройте в Expo Go (iOS/Android) или запустите `npm run android` / `npm run ios`
с установленным симулятором/эмулятором.

> `npm install`, `tsc --noEmit`, `eslint` и `jest` были реально прогнаны в
> среде разработки (см. HANDOFF.md — 0 ошибок типов, 0 ошибок линта, 27/27
> тестов). Metro/симулятор/реальное устройство — не запускались, доступа к
> нативным SDK и эмуляторам в этой среде нет. Так что типы и логика
> проверены по-настоящему, а не только "на глаз", но визуальный рендер и
> нативное поведение (жесты шторки, haptics, звук) — ещё нет.

## Структура проекта

```
src/
├── core/theme/       — дизайн-токены (цвета/шрифты), 1:1 с HTML-прототипом
├── engines/          — чистые функции: BMR/TDEE/1RM/RPE/плато (без I/O)
├── services/         — Open Food Facts + wger REST-клиенты
├── state/            — Zustand store с персистентностью через AsyncStorage
├── components/       — переиспользуемые UI-блоки (шторка, кольцо калорий, график веса)
├── navigation/       — нижняя навигация (4 таба)
└── features/
    ├── workout/      — тренировка, карточка упражнения (RIR/1RM/таймер отдыха)
    ├── nutrition/    — дневник питания, живой поиск Open Food Facts
    ├── analytics/    — прогресс (объём тренировок, график веса)
    └── profile/      — калькулятор КБЖУ, Refeed/Diet Break, экспорт/импорт
```

## Переменные окружения / секреты

Для wger API токена (не обязателен для публичного каталога, обязателен для
записи тренировок): добавьте `WGER_API_TOKEN` через `app.config.js` +
`expo-constants`, не хардкодьте в код.

Для EAS Build: `EXPO_TOKEN` в GitHub Secrets репозитория (см.
`.github/workflows/ci.yml` — job `eas-build-android` выключен по умолчанию,
включите после настройки аккаунта Expo).

## План апгрейда Expo / React Native (ревью-находка #17)

Текущее состояние после шага 8: Expo SDK **58**, RN 0.88.1, react/react-dom
**19.3.0**, **New Architecture включена** (`newArchEnabled: true`).
pnpm overrides единого react-мира сняты (с шага 3): воркспейсы сами пинят
одинаковые версии, `node-linker=hoisted` в `.npmrc` остаётся. Версии
экспо-пакетов сверены с `bundledNativeModules.json` expo 58.0.22.
TypeScript ~6.0.3, @types/react ~19.3.0, zustand ^5.0.0. compileSdk и
iOS deploymentTarget — по дефолтам expo-build-properties SDK 58
(явные оверрайды сняты; minSdk 26 сохранён — требование Health Connect).
reanimated 4.7.1 + worklets 0.13.0 (New Arch-линия с шага 4).
**expo-av удалён** (в SDK 55 его нет): ExerciseVideo переведён на
expo-video (~58.0.13), звук бипа отдыха — на expo-audio (~58.0.11).
expo-file-system 58: легаси-API на
`expo-file-system/legacy` (7 файлов + jest-моки).

Поэтапный план — по одному SDK за шаг; каждый шаг завершается зелёным
CI, type-check, jest и ручным smoke-тестом на устройстве; не совмещать
с другими изменениями:

1. ~~SDK 51 → 52~~ — готово (#293): react 18.2.0 → 18.3.1 (требование RN 0.76),
   RN 0.74.5 → 0.76.9, все expo-* до SDK-52, newArch явно выключен,
   iOS deployment target 13.4 → 15.1 (минимум RN 0.76).
2. ~~SDK 52 → 53~~ — готово: RN 0.76.9 → 0.79.6, react 18.3.1 → 19.0.0
   (требование SDK 53; web переведён на ту же пару react 19.0.0 +
   react-dom 19.0.0, pnpm overrides — на react-19 мир), все expo-* до
   SDK-53 по bundledNativeModules expo 53.0.27 (asset ~11.1.7, av
   ~15.1.7, build-properties ~0.14.8, camera ~16.1.11, dev-client ~5.2.4,
   document-picker ~13.1.6, file-system ~18.1.11, font ~13.3.2,
   haptics/keep-awake ~14.1.4, notifications ~0.31.5, speech/sharing
   ~13.1.x, sqlite ~15.2.14, status-bar ~2.2.3), screens ~4.11.1,
   reanimated ~3.17.4, gesture-handler ~2.24.0, safe-area-context 5.4.0,
   svg 15.11.2, async-storage 2.1.2, TS ~5.3.3 → ~5.8.3.
   New Architecture по-прежнему явно выключена (`newArchEnabled: false`:
   @gorhom/bottom-sheet v4 и healthkit-модули на новой архитектуре не
   проверены — включим отдельным шагом после smoke-теста). iOS
   deployment target 15.1 (минимум RN 0.79 — не изменился). В SDK 53 на
   Android edge-to-edge включён по умолчанию — проверить UI при
   smoke-тесте. react-test-renderer 19.0.0 (пакет deprecated, но существует
   для 19-й линии; при переходе на @testing-library/react-native —
   заменить).
3. ~~SDK 53 → 54~~ — готово: RN 0.79.6 → 0.81.5, react 19.0.0 → 19.1.0,
   все expo-* до SDK-54 (bundledNativeModules expo 54.0.38), TS ~5.9.2,
   zustand 4 → 5, pnpm overrides сняты (`node-linker=hoisted` остаётся),
   compileSdk 35 → 36; reanimated ~3.19.5 и slider 4.5.7 — осознанно
   для legacy-архитектуры; легаси file-system → `expo-file-system/legacy`.
4. ~~Включение New Architecture~~ — готово: `newArchEnabled: true`,
   react-native-reanimated ~4.1.1 + react-native-worklets 0.5.1
   (babel-плагин `react-native-worklets/plugin`), slider 5.2.2,
   @gorhom/bottom-sheet ^5.2.14 (v4 не поддерживает New Arch).
   healthkit (@kingstinct ^8.5.0), health-connect ^3.3.3 (поддерживает
   New Arch с v2) и llama.rn 0.9.7 оставлены на текущих версиях —
   проверить нативное поведение при smoke-тесте на устройстве
   (нативные сборки в CI не гоняются).
5. ~~SDK 54 → 55~~ — готово: RN 0.81.5 → 0.83.10, react 19.1.0 → 19.2.0
   (web синхронно), все expo-* до SDK-55 (bundledNativeModules expo
   55.0.32), reanimated 4.2.1 + worklets 0.7.4, @types/react ~19.2.2,
   compileSdk/deploymentTarget — по дефолтам SDK 55; **expo-av удалён из
   SDK 55** — ExerciseVideo мигрирован на expo-video (VideoView +
   useVideoPlayer, события statusChange/playingChange вместо
   AVPlaybackStatus), звук бипа отдыха — на expo-audio
   (createAudioPlayer + replace, RestTimerEngine).
6. ~~SDK 55 → 56~~ — готово: RN 0.83.10 → 0.85.3, react 19.2.0 → 19.2.3
   (web синхронно), все expo-* до SDK-56 (bundledNativeModules expo
   56.0.24), reanimated 4.3.1 + worklets 0.8.3, @react-native-picker/picker
   2.11.1 → 2.11.4 (по bundled). TS ~5.9.2 и @types/react ~19.2.2 не
   менялись. Осознанные отклонения от bundled: slider 5.2.2 (в bundled
   5.2.0 — наша новее, та же мажорная), react-native-view-shot 4.0.3
   (в bundled 5.1.0 — мажорный апгрейд вынесен из шага SDK).
7. ~~SDK 56 → 57~~ — готово: RN 0.85.3 → 0.86.3, react 19.2.3 не менялся
   (в SDK 57 та же линия react), все expo-* до SDK-57 (bundledNativeModules
   expo 57.0.31), reanimated 4.5.1 + worklets 0.10.1, gesture-handler
   ~2.32.0. safe-area/screens/svg/picker — без изменений (совпадают с
   bundled). TS ~5.9.2 и @types/react ~19.2.2 не менялись. Осознанные
   отклонения от bundled: slider 5.2.2 (в bundled 5.2.0 — наша новее),
   react-native-view-shot 4.0.3 (в bundled 5.1.0 — мажорный апгрейд
   вынесен из шага SDK).
8. ~~SDK 57 → 58~~ — готово: RN 0.86.3 → 0.88.1, react 19.2.3 → 19.3.0
   (web синхронно, @types/react ~19.3.0), все expo-* до SDK-58
   (bundledNativeModules expo 58.0.22), reanimated 4.7.1 + worklets
   0.13.0, gesture-handler ~3.3.0 (мажорная линия; peer-совместим с
   bottom-sheet ^5.2.14 — его peer >=2.16.1, в коде используется только
   GestureHandlerRootView), safe-area ~5.10.1, screens ~4.30.1,
   svg 15.16.0, TS ~5.9.2 → ~6.0.3 (шаблон SDK 58). Осознанные
   отклонения от bundled: slider 5.2.2 (в bundled 5.2.1 — наша новее),
   react-native-view-shot 4.0.3 (в bundled 6.1.1 — мажорный апгрейд
   вынесен из шага SDK).
9. SDK 58 — последний известный SDK (expo@latest). Апгрейд завершён:
   остаток — ручной smoke-тест на устройстве (edge-to-edge, жесты,
   видео, бип, HealthKit/Health Connect, llama.rn) и, при желании,
   включение job `eas-build-android` в ci.yml для EAS smoke.

Апгрейд не совмещать с другими изменениями; переход web-пакетов на
React 19 выполнен в шаге 2 вместе с mobile (единый react-мир, SDK 53).

## AI-ассистент и приватность (BYO-ключи)

AI-ассистент работает по модели bring-your-own-key: пользователь сам указывает
провайдера, адрес и **свой** API-ключ. Ключи хранятся локально в AsyncStorage
в открытом виде (persist-ключ `fitpulse_ai_state`) и никуда не отправляются,
кроме выбранной пользователем платформы: запросы идут с устройства напрямую.

Имейте в виду для общих устройств и экспорта/бэкапов: ключ читается из
локального стора без дополнительной защиты (осознанный компромисс BYO;
возможное улучшение — expo-secure-store).

Адреса с `http://` допускаются (локальные прокси/LAN), но клиент пишет
warning в лог: ключ уйдёт без шифрования. Вне локальной сети используйте
только `https://`.

## Лицензия / медицинский дисклеймер

Это инструмент для трекинга, не медицинское изделие. Формулы (Миффлин-Сан
Жеора, Эпли) — общепринятые оценочные модели, не подставляйте их вместо
консультации врача или диетолога.
