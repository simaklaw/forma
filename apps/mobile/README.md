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

Текущее состояние после шага 3: Expo SDK **54**, RN 0.81.5, react/react-dom
**19.1.0**. pnpm overrides единого react-мира сняты: воркспейсы
сами пинят 19.1.0 (версии совпадают), `node-linker=hoisted` в
`.npmrc` остаётся — Expo по-прежнему требует его для native-сборок.
Версии экспо-пакетов сверены с `bundledNativeModules.json` expo 54.0.38 —
тот же источник, которым пользуется `npx expo install --fix`.
TypeScript в mobile поднят ~5.8.3 → ~5.9.2 (версия шаблона SDK 54).
Zustand унифицирован: mobile 4.5.2 → ^5.0.0 (API-миграция не
потребовалась). Осознанные отклонения от bundled для legacy-архитектуры
(`newArchEnabled: false`): react-native-reanimated ~3.19.5 вместо ~4.1.1
и slider 4.5.7 вместо 5.0.1 — старшие линии работают только на New
Architecture. expo-file-system 19: легаси-API перенесён на
`expo-file-system/legacy` (корневые заглушки кидают в рантайме) —
импорты в LlamaModelService, BackupCard, importActivityFile и
importGymHistoryFile переведены.

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
4. **SDK 54 → 55+ = включение New Architecture** (SDK 55 работает только
   на New Arch): `newArchEnabled: true`, reanimated 4 + react-native-worklets,
   slider 5, @gorhom/bottom-sheet v5, проверка healthkit/health-connect
   и llama.rn на новой архитектуре — отдельным шагом после smoke-теста.
5. На каждом шаге: локально `tsc --noEmit` + jest; EAS Build smoke
   (job `eas-build-android` в ci.yml по умолчанию выключен — включать
   на время шагов апгрейда).

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
