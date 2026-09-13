# FORMA

Домашний тренер и диетолог. Спокойный интерфейс, видео-упражнения, дневник тренировок и питания, прогресс.

**Стек (текущий прототип):** React 19 · TanStack Start/Router · Tailwind v4 · Zustand · Recharts · Vaul

**План:** Flutter APK (домашние тренировки) → GitHub Actions → wger API / Open Food Facts.

## Быстрый старт

```bash
npm install
npm run dev
```

Открой `http://localhost:8080`.

## Что уже есть

- Онбординг (цель, оборудование, дни, макросы)
- Сегодня / планы / каталог упражнений с превью-видео
- Живой плеер (сеты, отдых, скорость 0.75–1.25×)
- Дневник питания + вода + «как вчера»
- Прогресс: вес, талия, фото «было/стало», мышцы недели
- Профиль: тема, оборудование, экспорт JSON
- Данные локально (`localStorage`, ключ `forma-v1`)

## Медиа упражнений

Положите файлы в `public/exercises/`:

| Файл | Назначение |
|------|------------|
| `squat.jpg` / `squat.mp4` | Приседания |
| `pushup.jpg` / `pushup.mp4` | Отжимания |
| `plank.jpg` / `plank.mp4` | Планка |
| `lunge.jpg` / `lunge.mp4` | Выпады |
| `glute.jpg` / `glute.mp4` | Ягодичный мост |
| `birddog.jpg` | Bird dog |
| `deadbug.jpg` | Dead bug |
| `sideplank.jpg` | Боковая планка |
| `chairdip.jpg` | Отжимания на стуле |

Без медиа плеер покажет пустой poster — логика сетов работает.

## Структура

```
src/
  features/     # экраны
  components/   # UI
  lib/          # domain, store, catalog
  routes/       # TanStack file routes
public/
  exercises/    # видео и постеры
```

## Домен (wger-совместимо)

Routine → Day → Slot → Session/Log · Exercise + Video · Nutrition · Weight

## Лицензия

Прототип для личного использования. Данные упражнений — собственный каталог дома.
