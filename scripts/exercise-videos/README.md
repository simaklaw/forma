# Exercise video render scripts (salvaged)

Генераторы 13 бандловых MP4/JPG клипов в `apps/web/public/exercises/`:
`pushup`, `squat`, `pullup`, `lunge`, `plank`, `dead-bug`, `chair-dip`,
`glute-bridge`, `row-band`, `hip-thrust`, `shoulder-press`, `side-plank`,
`stomach-vacuum`.

Перенесены из замороженного дубль-репозитория `simaklaw/Forma-fitpulse-google`
перед его удалением (issue #155) — это единственное место, откуда бандловые
клипы воспроизводимы: скрипты рисуют биомеханическую анимацию
(SVG-кадры или программный рендер в RGBA-буфер) и собирают MP4 через ffmpeg.

## Запуск

Требуется Node и `ffmpeg` в PATH. Ручной инструмент, в CI не вызывается.
Каждый скрипт пишет напрямую в `apps/web/public/exercises/`.

- `render-<exercise>.js`, `generate-squat-video.js` — одиночные рендеры
- `render-batch-4.js`, `render-final-2.js` — батч-рендеры нескольких клипов
  одним прогоном (с одновременной генерацией JPG-превью из середины клипа)

Для импортируемой библиотеки видео используется другой пайплайн —
см. `docs/exercise-video-pipeline.md`.
