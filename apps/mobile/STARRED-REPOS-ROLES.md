# Starred repos → роли для FitPulse

Правило: **не** вшиваем декомпил чужих APK в `apps/mobile`. Берём паттерны, OSS-данные, инфраструктуру.

## Сейчас в работе (A/B продукт)

| Репо | Роль |
|------|------|
| simaklaw/*-analysis (Fitify/HW Pro/YAZIO/rus39) | **ТЗ и UX backlog** (не код jadx) |
| wger-project/wger | Каталог упражнений / идеи nutrition API |
| simonoppowa/OpenNutriTracker | UX дневника калорий |
| public-apis/public-apis | Open Food Facts и др. публичные API |
| DietrichGebert/ponytail | Минимальный код, без оверинжиниринга |
| anthropics/skills, mattpocock/skills, vercel-labs/skills | Скиллы агента |
| BeehiveInnovations/pal-mcp-server, google-gemini/gemini-cli | Мульти-модельный coding agent |
| react/react | База UI |

## Контент / медиа (позже)

| Репо | Роль |
|------|------|
| Open-Generative-AI, LTX-2, ViMax, OpenMontage, Mesh2Motion, sam-3d-objects | **Свои** демо-видео/анимации техники (не чужие клипы) |
| transmute-app/transmute | Конвертация ассетов |
| ACE-Step | Опционально: фоновая музыка тренировки |

## Сборка / реверс (только анализ, не продакшен-код)

| Репо | Роль |
|------|------|
| iBotPeaches/Apktool, ax/apk.sh, ApkToolPlus, REAndroid/APKEditor | Реверс **референс-APK** → документы analysis |
| ApkToolBoxGUI, AndroidDecompiler, onekey-decompile-apk, decompile-apk | То же |
| apk-mitm, ApkVulCheck | Проверка своего APK |
| Hax4us/Apkmod, revanced-magisk-module | **Не использовать** в FitPulse (payload / патчи чужих приложений) |

## Flutter-демо (только идеи UI)

fitly, NeverSkip, FitSage, OpenNutriTracker, trainit и др. — **скрин-паттерны**, не перенос Dart в RN.

## Не в скоупе продукта

maigret, spiderfoot, PhoneNumber-OSINT, SEO lists, elementor, OpenBidKit, is-a.dev, marketing-only tools — вне ядра FitPulse.

## Итог

**Помогает сильнее всего сейчас:** analysis-репы + wger + OpenNutriTracker + theme/brand work.  
**Видео:** генерация своих клипов (LTX/ViMax), не копипаст Fitify.  
**Агент:** pal-mcp / gemini-cli / skills — ускорение разработки, не замена домена.
