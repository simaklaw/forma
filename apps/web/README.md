# FitPulse (web)

Веб-часть монорепозитория Forma / FitPulse: SPA на Vite + React + TanStack Router.

## Запуск

Из корня монорепо:

```bash
pnpm install
pnpm --filter @forma/web dev
```

Или из `apps/web`:

```bash
pnpm install
pnpm dev
```

## FitPulse HTML-прототип (design handoff)

Статичный кликабельный прототип с **теми же токенами**, что mobile (`#00E5A8`, `#0B0F14`, soft cards):

- Файл: [`public/fitpulse-prototype.html`](./public/fitpulse-prototype.html)
- После `pnpm dev`: http://localhost:5173/fitpulse-prototype.html (порт смотри в выводе Vite)
- Можно открыть файл напрямую в браузере без сборки

Экраны: Тренировка · Питание · Тренер · Прогресс · Профиль.  
Это **UI-reference**, не production-логика (streaming coach / store — в native и React SPA).

## Тема

CSS-токены: `src/styles.css` (dark mint aligned with `apps/mobile/src/core/theme/tokens.ts`).

## Медиа упражнений

`public/exercises/` — jpg / mp4 / svg для каталога.

## Структура

- `src/features/` — экраны SPA
- `src/lib/` — store, каталог
- `src/routes/` — TanStack Router
- `public/` — статика + HTML-прототип
