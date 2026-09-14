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

Открой http://localhost:8080

## Медиа упражнений

В репозитории уже лежат **постеры SVG** (`public/exercises/*.svg`) в фирменной sage-палитре.

Короткие **mp4-петли** (zoom) и JPG сгенерированы локально. Чтобы добавить видео:

1. Скачай архив `forma-media.zip` (из чата с Grok или сгенерируй скриптом ниже).
2. Распакуй в `public/exercises/`:
   ```bash
   unzip forma-media.zip -d public/exercises
   ```
3. Перезапусти `npm run dev`.

Скрипт перегенерации (ImageMagick + ffmpeg):

```bash
# см. public/exercises — SVG уже в репо
# PNG/JPG/MP4 собираются из SVG тем же pipeline, что использовался при разработке
```

Пока mp4 нет, плеер показывает poster (SVG) — карточки и UI уже рабочие.

## Структура

- `src/features/` — экраны (onboarding, today, nutrition, progress, profile, player)
- `src/lib/` — домен (forma.ts), каталог упражнений, Zustand store, типы
- `src/components/` — UI: macro-ring, exercise-card, week-dots, muscle-map, compare-slider, shell
- `src/routes/` — TanStack Router
- `public/exercises/` — постеры и видео

## Дизайн

Sage-палитра, Material 3 + Cupertino-гибрид, breathing rest ring, coach lines, photo compare.

## Дальше

Перенос в Flutter (Riverpod, go_router, media_kit, drift) + wger backend + GitHub Actions APK.
