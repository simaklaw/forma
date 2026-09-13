# FORMA

Домашний тренер и диетолог. Спокойный интерфейс, видео-упражнения, дневники тренировок и питания, прогресс.

## Стек (веб-прототип)

- TanStack Start (React + Vite)
- Tailwind CSS v4
- Zustand (persist)
- Recharts, Vaul, Lucide

Это **интерактивный веб-прототип** будущего Flutter-приложения. Логика, экраны и UX совпадают с целевым Android-клиентом.

## Запуск

```bash
npm install
npm run dev
```

Открой http://localhost:3000

## Структура

- `src/features/` — экраны (onboarding, today, nutrition, progress, profile, player)
- `src/lib/` — домен (forma.ts), каталог упражнений, Zustand store, типы
- `src/components/` — UI: macro-ring, exercise-card, week-dots, muscle-map, compare-slider, shell
- `src/routes/` — TanStack Router

## Дизайн

Sage-палитра, Material 3 + Cupertino-гибрид, breathing rest ring, coach lines, photo compare.

## Дальше

Перенос в Flutter (Riverpod, go_router, media_kit, drift) + wger backend + GitHub Actions APK.
