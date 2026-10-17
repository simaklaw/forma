/**
 * Штамп сборки (issue #171): версия приложения + git-SHA коммита, из которого собран APK.
 * EXPO_PUBLIC_GIT_SHA инлайнится Metro при бандлинге (babel-preset-expo); в CI задаётся в
 * .github/workflows/build-apk.yml, локально остаётся 'dev'.
 */

// Локальная декларация: мобильный воркспейс не тянет @types/node, читаем только своё поле.
declare const process: { env: Record<string, string | undefined> };

/** Держать в синхроне с apps/mobile/app.json и package.json ("version"). */
export const APP_VERSION = '0.1.0';

export const BUILD_SHA: string = process.env.EXPO_PUBLIC_GIT_SHA ?? 'dev';

/** Однострочник для подвала профиля: 'FitPulse v0.1.0 · fe032cc'. */
export function buildStamp(): string {
  const sha = BUILD_SHA.length >= 7 ? BUILD_SHA.slice(0, 7) : BUILD_SHA;
  return `FitPulse v${APP_VERSION} · ${sha}`;
}
