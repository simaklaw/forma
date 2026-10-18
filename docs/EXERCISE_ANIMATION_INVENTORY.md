# Инвентаризация библиотеки анимаций FitPulse

**Снимок исходников:** ветка `main`, commit `503e7b9a8905e80ff876721a15460db863b5f18c` (18 октября 2026).
Создана для проектирования оригинальных офлайн-анимаций; наличие существующего медиа не означает разрешение на его повторное использование.

## Результаты

- Домашний план: **27** записей; зал: **35** записей.
- Всего **62** записей плана, **62** уникальных числовых ID и **50** уникальных названий. Название не является надёжным идентификатором — варианты техники могут называться одинаково.
- Импортированный каталог: **163** упражнений; русские названия есть у 163, русские инструкции — у 163.
- Оборудование импортированного каталога: bodyweight: 80; bands: 16; machine: 10; dumbbells: 19; barbell: 21; cable: 13; ez-bar: 1; kettlebell: 3.
- Старые локальные изображения: **96** папок и **192** JPG-кадров; соответствие ID импортированного каталога найдено для **96 из 163** упражнений.
- GIF-манифест: **58** записей, из них с localGifPath — **56**; локальных GIF-файлов — **61**; статических Metro require — **61**.
- Конкретное расхождение: `lib-band-hip-adductions.gif`, `lib-glute-kickback.gif` и `lib-side-bridge.gif` остаются среди локальных assets/Metro require, но отсутствуют в GIF-манифесте (исключены из-за неверных автосопоставлений); ещё 2 записи манифеста не имеют локального GIF-файла.
- MP4-манифест: **0** записей; статических встроенных MP4-ключей — **13**.
- В домашнем плане все 27 записи имеют mediaKey, но используется только 12 разных ключей. Для зала mediaKey у 0 из 35 записей. Повторные назначения требуют проверки реального содержимого видеороликов.

## Выявленные риски и пробелы

1. Наличие двух JPG-кадров не означает наличие непрерывной анимации.
2. Несколько разных упражнений используют один MP4-ключ. До принятия его как доказательства покрытия надо сверить конкретную технику, оборудование и ракурс.
3. Импортированный каталог содержит 163 записи, GIF-манифест — 58, старые JPG-папки покрывают 96 записей. Полного медиа-покрытия нет.
4. В текущем дереве есть конкретные расхождения: три исключённых GIF остаются в assets/Metro require, а две записи манифеста не имеют локального файла. Проверить физические файлы, манифест и Metro require; не включать исключённые упражнения в UI как точные демонстрации без ручной проверки.
5. Заголовок импортированного каталога указывает Unlicense/Public Domain. В GIF-манифесте не указано отдельное поле лицензии. Лицензию каждого источника необходимо проверить отдельно; новые персонажи и риг будут оригинальными.
6. В манифестах не найден явный выбор male/female-варианта анимации. Следует добавить явное поле варианта и безопасный fallback.

## Ключи видео, повторно назначенные упражнениям

| Ключ | Число назначений | Упражнения |
|---|---:|---|
| chair-dip | 2 | Отжимания от стула (#18); Отжимания от пола на трицепс (#55) |
| dead-bug | 1 | Мёртвый жук (#16) |
| glute-bridge | 3 | Ягодичный мостик (#20); Отведение ноги назад (#56); Ягодичный мостик (#60) |
| hip-thrust | 1 | Ягодичный мостик с опорой (#21) |
| lunge | 5 | Выпады (#14); Болгарские выпады (#51); Обратные выпады (#52); Зашагивания (#57); Выпады (#62) |
| plank | 4 | Планка (#15); Скручивания (#53); Планка с касанием плеч (#54); Планка (#61) |
| pullup | 2 | Подтягивания (#11); Австралийские подтягивания (#50) |
| pushup | 4 | Отжимания (#10); Отжимания узким хватом (#48); Отжимания с возвышения ног (#49); Отжимания (#59) |
| row-band | 1 | Тяга с резиной (#12) |
| shoulder-press | 1 | Жим над головой с резиной (#19) |
| side-plank | 1 | Боковая планка (#17) |
| squat | 2 | Приседания (#13); Приседания (#58) |

## Все упражнения домашних и заловых планов

| Режим | ID | Название | mediaKey | Первичная оценка |
|---|---:|---|---|---|
| Зал | 1 | Приседания со штангой | — | прямого встроенного видео-ключа нет |
| Зал | 2 | Становая тяга | — | прямого встроенного видео-ключа нет |
| Зал | 3 | Выпады с гантелями | — | прямого встроенного видео-ключа нет |
| Зал | 4 | Жим штанги лёжа | — | прямого встроенного видео-ключа нет |
| Зал | 5 | Жим гантелей сидя | — | прямого встроенного видео-ключа нет |
| Зал | 6 | Разгибания на трицепс на блоке | — | прямого встроенного видео-ключа нет |
| Зал | 7 | Тяга штанги в наклоне | — | прямого встроенного видео-ключа нет |
| Зал | 8 | Тяга верхнего блока | — | прямого встроенного видео-ключа нет |
| Зал | 9 | Сгибания на бицепс со штангой | — | прямого встроенного видео-ключа нет |
| Домашняя программа | 10 | Отжимания | pushup | есть ключ; проверить соответствие ролику |
| Домашняя программа | 11 | Подтягивания | pullup | есть ключ; проверить соответствие ролику |
| Домашняя программа | 12 | Тяга с резиной | row-band | есть ключ; проверить соответствие ролику |
| Домашняя программа | 13 | Приседания | squat | есть ключ; проверить соответствие ролику |
| Домашняя программа | 14 | Выпады | lunge | есть ключ; проверить соответствие ролику |
| Домашняя программа | 15 | Планка | plank | есть ключ; проверить соответствие ролику |
| Домашняя программа | 16 | Мёртвый жук | dead-bug | есть ключ; проверить соответствие ролику |
| Домашняя программа | 17 | Боковая планка | side-plank | есть ключ; проверить соответствие ролику |
| Домашняя программа | 18 | Отжимания от стула | chair-dip | есть ключ; проверить соответствие ролику |
| Домашняя программа | 19 | Жим над головой с резиной | shoulder-press | есть ключ; проверить соответствие ролику |
| Домашняя программа | 20 | Ягодичный мостик | glute-bridge | есть ключ; проверить соответствие ролику |
| Домашняя программа | 21 | Ягодичный мостик с опорой | hip-thrust | есть ключ; проверить соответствие ролику |
| Зал | 22 | Приседания со штангой | — | прямого встроенного видео-ключа нет |
| Зал | 23 | Жим гантелей лёжа | — | прямого встроенного видео-ключа нет |
| Зал | 24 | Тяга гантели в наклоне | — | прямого встроенного видео-ключа нет |
| Зал | 25 | Жим штанги лёжа | — | прямого встроенного видео-ключа нет |
| Зал | 26 | Тяга гантели в наклоне | — | прямого встроенного видео-ключа нет |
| Зал | 27 | Разведение гантелей в стороны | — | прямого встроенного видео-ключа нет |
| Зал | 28 | Приседания со штангой | — | прямого встроенного видео-ключа нет |
| Зал | 29 | Румынская тяга | — | прямого встроенного видео-ключа нет |
| Зал | 30 | Выпады с гантелями | — | прямого встроенного видео-ключа нет |
| Зал | 31 | Жим гантелей на наклонной | — | прямого встроенного видео-ключа нет |
| Зал | 32 | Разведения гантелей | — | прямого встроенного видео-ключа нет |
| Зал | 33 | Тяга горизонтального блока | — | прямого встроенного видео-ключа нет |
| Зал | 34 | Молотковые сгибания | — | прямого встроенного видео-ключа нет |
| Зал | 35 | Жим ногами | — | прямого встроенного видео-ключа нет |
| Зал | 36 | Подъёмы на носки | — | прямого встроенного видео-ключа нет |
| Зал | 37 | Румынская тяга | — | прямого встроенного видео-ключа нет |
| Зал | 38 | Разведения на заднюю дельту | — | прямого встроенного видео-ключа нет |
| Зал | 39 | Сгибания ног лёжа | — | прямого встроенного видео-ключа нет |
| Зал | 40 | Армейский жим | — | прямого встроенного видео-ключа нет |
| Зал | 41 | Махи в стороны | — | прямого встроенного видео-ключа нет |
| Зал | 42 | Подъёмы перед собой | — | прямого встроенного видео-ключа нет |
| Зал | 43 | Шраги с гантелями | — | прямого встроенного видео-ключа нет |
| Зал | 44 | Сгибания со штангой | — | прямого встроенного видео-ключа нет |
| Зал | 45 | Молотковые сгибания | — | прямого встроенного видео-ключа нет |
| Зал | 46 | Французский жим | — | прямого встроенного видео-ключа нет |
| Зал | 47 | Разгибания на блоке | — | прямого встроенного видео-ключа нет |
| Домашняя программа | 48 | Отжимания узким хватом | pushup | есть ключ; проверить соответствие ролику |
| Домашняя программа | 49 | Отжимания с возвышения ног | pushup | есть ключ; проверить соответствие ролику |
| Домашняя программа | 50 | Австралийские подтягивания | pullup | есть ключ; проверить соответствие ролику |
| Домашняя программа | 51 | Болгарские выпады | lunge | есть ключ; проверить соответствие ролику |
| Домашняя программа | 52 | Обратные выпады | lunge | есть ключ; проверить соответствие ролику |
| Домашняя программа | 53 | Скручивания | plank | есть ключ; проверить соответствие ролику |
| Домашняя программа | 54 | Планка с касанием плеч | plank | есть ключ; проверить соответствие ролику |
| Домашняя программа | 55 | Отжимания от пола на трицепс | chair-dip | есть ключ; проверить соответствие ролику |
| Домашняя программа | 56 | Отведение ноги назад | glute-bridge | есть ключ; проверить соответствие ролику |
| Домашняя программа | 57 | Зашагивания | lunge | есть ключ; проверить соответствие ролику |
| Домашняя программа | 58 | Приседания | squat | есть ключ; проверить соответствие ролику |
| Домашняя программа | 59 | Отжимания | pushup | есть ключ; проверить соответствие ролику |
| Домашняя программа | 60 | Ягодичный мостик | glute-bridge | есть ключ; проверить соответствие ролику |
| Домашняя программа | 61 | Планка | plank | есть ключ; проверить соответствие ролику |
| Домашняя программа | 62 | Выпады | lunge | есть ключ; проверить соответствие ролику |

## Полный импортированный каталог

| Stable ID | Название RU | Название EN | Оборудование | Существующие JPG | GIF |
|---|---|---|---|---|---|
| lib-3-4-sit-up | Скручивания на ¾ | 3/4 Sit-Up | bodyweight | 2 JPG | локальный GIF |
| lib-90-90-hamstring | Разгибание ноги 90/90 | 90/90 Hamstring | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-air-bike | Велосипед (пресс) | Air Bike | bodyweight | 2 JPG | локальный GIF |
| lib-all-fours-quad-stretch | Растяжка квадрицепса в упоре на четвереньках | All Fours Quad Stretch | bodyweight | 2 JPG | локальный GIF |
| lib-alternate-heel-touchers | Касания пяток поочерёдно | Alternate Heel Touchers | bodyweight | 2 JPG | локальный GIF |
| lib-band-good-morning | Наклоны с резинкой (гуд морнинг) | Band Good Morning | bands | 2 JPG | локальный GIF |
| lib-band-good-morning-pull-through | Наклоны с резинкой (протяжка) | Band Good Morning (Pull Through) | bands | 2 JPG | локальный GIF |
| lib-band-hip-adductions | Приведение бедра с резинкой | Band Hip Adductions | bands | 2 JPG | локальный GIF |
| lib-band-pull-apart | Разведение резинки перед собой | Band Pull Apart | bands | 2 JPG | локальный GIF |
| lib-bent-knee-hip-raise | Подъём таза с согнутыми коленями | Bent-Knee Hip Raise | bodyweight | 2 JPG | локальный GIF |
| lib-body-up | Подъём корпуса (боди-ап) | Body-Up | bodyweight | 2 JPG | локальный GIF |
| lib-bodyweight-squat | Приседания с собственным весом | Bodyweight Squat | bodyweight | 2 JPG | локальный GIF |
| lib-bottoms-up | Подъём таза «bottoms up» | Bottoms Up | bodyweight | 2 JPG | локальный GIF |
| lib-butt-ups | Подъёмы таза | Butt-Ups | bodyweight | 2 JPG | локальный GIF |
| lib-butt-lift-bridge | Ягодичный мостик | Butt Lift (Bridge) | bodyweight | 2 JPG | локальный GIF |
| lib-calf-raises-with-bands | Подъёмы на носки с резинкой | Calf Raises - With Bands | bands | 2 JPG | нет GIF в манифесте |
| lib-clock-push-up | Отжимания «часы» | Clock Push-Up | bodyweight | 2 JPG | локальный GIF |
| lib-cocoons | Коконы (скручивания) | Cocoons | bodyweight | 2 JPG | локальный GIF |
| lib-cross-body-crunch | Скручивания крест-накрест | Cross-Body Crunch | bodyweight | 2 JPG | локальный GIF |
| lib-cross-over-with-bands | Кроссовер с резинкой | Cross Over - With Bands | bands | 2 JPG | нет GIF в манифесте |
| lib-crunch-hands-overhead | Скручивания с руками над головой | Crunch - Hands Overhead | bodyweight | 2 JPG | локальный GIF |
| lib-crunches | Скручивания | Crunches | bodyweight | 2 JPG | локальный GIF |
| lib-dead-bug | Мёртвый жук | Dead Bug | bodyweight | 2 JPG | локальный GIF |
| lib-dips-triceps-version | Отжимания на трицепс (брусья/опора) | Dips - Triceps Version | bodyweight | 2 JPG | локальный GIF |
| lib-double-leg-butt-kick | Захлёст голени двумя ногами | Double Leg Butt Kick | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-elbow-to-knee | Локоть к колену | Elbow to Knee | bodyweight | 2 JPG | локальный GIF |
| lib-external-rotation-with-band | Наружная ротация плеча с резинкой | External Rotation with Band | bands | 2 JPG | нет GIF в манифесте |
| lib-fast-skipping | Бег на месте высокий темп | Fast Skipping | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-flat-bench-leg-pull-in | Подтягивание коленей лёжа | Flat Bench Leg Pull-In | bodyweight | 2 JPG | локальный GIF |
| lib-freehand-jump-squat | Приседания с выпрыгиванием | Freehand Jump Squat | bodyweight | 2 JPG | локальный GIF |
| lib-frog-sit-ups | Скручивания «лягушка» | Frog Sit-Ups | bodyweight | 2 JPG | локальный GIF |
| lib-glute-kickback | Махи ногой назад (ягодичные) | Glute Kickback | bodyweight | 2 JPG | локальный GIF |
| lib-groiners | Альпинист с поворотом (гроинеры) | Groiners | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-handstand-push-ups | Отжимания в стойке на руках | Handstand Push-Ups | bodyweight | 2 JPG | локальный GIF |
| lib-hip-circles-prone | Круги бедром лёжа на животе | Hip Circles (prone) | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-hip-extension-with-bands | Разгибание бедра с резинкой | Hip Extension with Bands | bands | 2 JPG | локальный GIF |
| lib-hip-flexion-with-band | Сгибание бедра с резинкой | Hip Flexion with Band | bands | 2 JPG | локальный GIF |
| lib-inchworm | Инчворм (шагающая планка) | Inchworm | bodyweight | 2 JPG | локальный GIF |
| lib-internal-rotation-with-band | Внутренняя ротация плеча с резинкой | Internal Rotation with Band | bands | 2 JPG | локальный GIF |
| lib-isometric-chest-squeezes | Изометрическое сведение груди | Isometric Chest Squeezes | bodyweight | 2 JPG | локальный GIF |
| lib-isometric-neck-exercise-front-and-back | Изометрия шеи вперёд-назад | Isometric Neck Exercise - Front And Back | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-isometric-neck-exercise-sides | Изометрия шеи в стороны | Isometric Neck Exercise - Sides | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-isometric-wipers | Изометрические «дворники» | Isometric Wipers | bodyweight | 2 JPG | локальный GIF |
| lib-jackknife-sit-up | Складка (джекнайф) | Jackknife Sit-Up | bodyweight | 2 JPG | локальный GIF |
| lib-janda-sit-up | Скручивания Янда | Janda Sit-Up | bodyweight | 2 JPG | локальный GIF |
| lib-knee-circles | Круги коленями | Knee Circles | bodyweight | 2 JPG | локальный GIF |
| lib-knee-tuck-jump | Прыжки с подтягиванием колен | Knee Tuck Jump | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-lateral-bound | Прыжки в сторону | Lateral Bound | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-lateral-raise-with-bands | Разведение рук в стороны с резинкой | Lateral Raise - With Bands | bands | 2 JPG | локальный GIF |
| lib-leg-pull-in | Подтягивание коленей лёжа | Leg Pull-In | bodyweight | 2 JPG | локальный GIF |
| lib-lower-back-curl | Разгибание поясницы | Lower Back Curl | bodyweight | 2 JPG | локальный GIF |
| lib-lying-crossover | Скручивания крест-накрест лёжа | Lying Crossover | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-lying-glute | Ягодичные лёжа | Lying Glute | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-lying-prone-quadriceps | Растяжка квадрицепса лёжа на животе | Lying Prone Quadriceps | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-monster-walk | Ходьба с резинкой (монстр-walk) | Monster Walk | bands | 2 JPG | локальный GIF |
| lib-oblique-crunches | Скручивания на косые мышцы | Oblique Crunches | bodyweight | 2 JPG | локальный GIF |
| lib-oblique-crunches-on-the-floor | Скручивания на косые на полу | Oblique Crunches - On The Floor | bodyweight | 2 JPG | локальный GIF |
| lib-overhead-triceps | Разгибание рук на трицепс над головой | Overhead Triceps | bodyweight | 2 JPG | локальный GIF |
| lib-plank | Планка | Plank | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-plyo-push-up | Плиометрические отжимания | Plyo Push-up | bodyweight | 2 JPG | локальный GIF |
| lib-push-up-wide | Отжимания широким хватом | Push-Up Wide | bodyweight | 2 JPG | локальный GIF |
| lib-push-ups-close-triceps-position | Отжимания узким хватом (трицепс) | Push-Ups - Close Triceps Position | bodyweight | 2 JPG | локальный GIF |
| lib-push-up-to-side-plank | Отжимание с выходом в боковую планку | Push Up to Side Plank | bodyweight | 2 JPG | локальный GIF |
| lib-pushups | Отжимания | Pushups | bodyweight | 2 JPG | локальный GIF |
| lib-pushups-close-and-wide-hand-positions | Отжимания узким и широким хватом | Pushups (Close and Wide Hand Positions) | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-rear-leg-raises | Махи ногой назад стоя | Rear Leg Raises | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-reverse-crunch | Обратные скручивания | Reverse Crunch | bodyweight | 2 JPG | локальный GIF |
| lib-rocket-jump | Прыжок «ракета» | Rocket Jump | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-russian-twist | Русский твист | Russian Twist | bodyweight | 2 JPG | локальный GIF |
| lib-scissor-kick | Ножницы (мах ногами) | Scissor Kick | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-scissors-jump | Прыжки ножницы | Scissors Jump | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-seated-biceps | Сгибание рук на бицепс сидя | Seated Biceps | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-seated-front-deltoid | Передняя дельта сидя | Seated Front Deltoid | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-seated-glute | Ягодичные сидя | Seated Glute | bodyweight | 2 JPG | локальный GIF |
| lib-shoulder-press-with-bands | Жим плеч с резинкой | Shoulder Press - With Bands | bands | 2 JPG | локальный GIF |
| lib-side-bridge | Боковая планка | Side Bridge | bodyweight | 2 JPG | локальный GIF |
| lib-side-jackknife | Боковая складка | Side Jackknife | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-side-leg-raises | Махи ногой в сторону лёжа | Side Leg Raises | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-single-arm-push-up | Отжимания на одной руке | Single-Arm Push-Up | bodyweight | 2 JPG | локальный GIF |
| lib-single-leg-butt-kick | Захлёст голени одной ногой | Single Leg Butt Kick | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-single-leg-glute-bridge | Ягодичный мостик на одной ноге | Single Leg Glute Bridge | bodyweight | 2 JPG | локальный GIF |
| lib-sit-up | Подъём корпуса (ситап) | Sit-Up | bodyweight | 2 JPG | локальный GIF |
| lib-speed-band-overhead-triceps | Разгибание на трицепс с резинкой стоя | Speed Band Overhead Triceps | bands | 2 JPG | нет GIF в манифесте |
| lib-spider-crawl | Паучий краул | Spider Crawl | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-split-jump | Прыжки в выпаде со сменой ног | Split Jump | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-squats-with-bands | Приседания с резинкой | Squats - With Bands | bands | 2 JPG | нет GIF в манифесте |
| lib-standing-hip-circles | Круги бедром стоя | Standing Hip Circles | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-standing-long-jump | Прыжок в длину с места | Standing Long Jump | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-standing-towel-triceps-extension | Разгибание на трицепс полотенцем стоя | Standing Towel Triceps Extension | bodyweight | 2 JPG | локальный GIF |
| lib-star-jump | Прыжок звездой | Star Jump | bodyweight | 2 JPG | локальный GIF |
| lib-stomach-vacuum | Вакуум живота | Stomach Vacuum | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-superman | Супермен | Superman | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-toe-touchers | Складка до носков лёжа | Toe Touchers | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-tuck-crunch | Скручивания с подтягиванием колен | Tuck Crunch | bodyweight | 2 JPG | локальный GIF |
| lib-upright-row-with-bands | Тяга к подбородку с резинкой | Upright Row - With Bands | bands | 2 JPG | локальный GIF |
| lib-wrist-circles | Круги кистями | Wrist Circles | bodyweight | 2 JPG | локальный GIF |
| lib-ab-crunch-machine | Скручивания на пресс в тренажёре | Ab Crunch Machine | machine | нет папки | нет GIF в манифесте |
| lib-alternate-hammer-curl | Молотковые сгибания поочерёдно | Alternate Hammer Curl | dumbbells | нет папки | нет GIF в манифесте |
| lib-arnold-dumbbell-press | Жим Арнольда | Arnold Dumbbell Press | dumbbells | нет папки | нет GIF в манифесте |
| lib-barbell-bench-press-medium-grip | Жим штанги лёжа (средний хват) | Barbell Bench Press - Medium Grip | barbell | нет папки | нет GIF в манифесте |
| lib-barbell-curl | Сгибания рук со штангой | Barbell Curl | barbell | нет папки | нет GIF в манифесте |
| lib-barbell-deadlift | Становая тяга со штангой | Barbell Deadlift | barbell | нет папки | нет GIF в манифесте |
| lib-barbell-full-squat | Приседания со штангой в полную глубину | Barbell Full Squat | barbell | нет папки | нет GIF в манифесте |
| lib-barbell-glute-bridge | Ягодичный мостик со штангой | Barbell Glute Bridge | barbell | нет папки | нет GIF в манифесте |
| lib-barbell-hip-thrust | Подъём таза со штангой с опорой (хип траст) | Barbell Hip Thrust | barbell | нет папки | нет GIF в манифесте |
| lib-barbell-incline-bench-press-medium-grip | Жим штанги на наклонной скамье | Barbell Incline Bench Press - Medium Grip | barbell | нет папки | нет GIF в манифесте |
| lib-barbell-lunge | Выпады со штангой | Barbell Lunge | barbell | нет папки | нет GIF в манифесте |
| lib-barbell-shrug | Шраги со штангой | Barbell Shrug | barbell | нет папки | нет GIF в манифесте |
| lib-barbell-squat | Приседания со штангой | Barbell Squat | barbell | нет папки | нет GIF в манифесте |
| lib-bent-over-barbell-row | Тяга штанги в наклоне | Bent Over Barbell Row | barbell | нет папки | нет GIF в манифесте |
| lib-butterfly | Сведение в тренажёре «бабочка» | Butterfly | machine | нет папки | нет GIF в манифесте |
| lib-cable-crossover | Кроссовер на блоках | Cable Crossover | cable | нет папки | нет GIF в манифесте |
| lib-cable-crunch | Скручивания на блоке стоя | Cable Crunch | cable | нет папки | нет GIF в манифесте |
| lib-cable-rope-overhead-triceps-extension | Разгибания на трицепс из-за головы с канатом | Cable Rope Overhead Triceps Extension | cable | нет папки | нет GIF в манифесте |
| lib-close-grip-barbell-bench-press | Жим штанги узким хватом | Close-Grip Barbell Bench Press | barbell | нет папки | нет GIF в манифесте |
| lib-close-grip-front-lat-pulldown | Тяга верхнего блока узким хватом | Close-Grip Front Lat Pulldown | cable | нет папки | нет GIF в манифесте |
| lib-concentration-curls | Концентрированные сгибания | Concentration Curls | dumbbells | нет папки | нет GIF в манифесте |
| lib-decline-barbell-bench-press | Жим штанги на скамье с отрицательным наклоном | Decline Barbell Bench Press | barbell | нет папки | нет GIF в манифесте |
| lib-dumbbell-bench-press | Жим гантелей лёжа | Dumbbell Bench Press | dumbbells | нет папки | нет GIF в манифесте |
| lib-dumbbell-bicep-curl | Сгибания рук с гантелями | Dumbbell Bicep Curl | dumbbells | нет папки | нет GIF в манифесте |
| lib-dumbbell-flyes | Разведения гантелей лёжа | Dumbbell Flyes | dumbbells | нет папки | нет GIF в манифесте |
| lib-dumbbell-lunges | Выпады с гантелями | Dumbbell Lunges | dumbbells | нет папки | нет GIF в манифесте |
| lib-dumbbell-shrug | Шраги с гантелями | Dumbbell Shrug | dumbbells | нет папки | нет GIF в манифесте |
| lib-ez-bar-skullcrusher | Французский жим с EZ-грифом | EZ-Bar Skullcrusher | ez-bar | нет папки | нет GIF в манифесте |
| lib-face-pull | Тяга к лицу на блоке с канатом | Face Pull | cable | нет папки | нет GIF в манифесте |
| lib-front-dumbbell-raise | Подъём гантели перед собой | Front Dumbbell Raise | dumbbells | нет папки | нет GIF в манифесте |
| lib-front-squat-clean-grip | Фронтальные приседания (хват «корзинка») | Front Squat (Clean Grip) | barbell | нет папки | нет GIF в манифесте |
| lib-goblet-squat | Гоблет-приседания с гирей у груди | Goblet Squat | kettlebell | нет папки | нет GIF в манифесте |
| lib-good-morning | Наклоны со штангой (гуд морнинг) | Good Morning | barbell | нет папки | нет GIF в манифесте |
| lib-hack-squat | Гакк-приседания | Hack Squat | machine | нет папки | нет GIF в манифесте |
| lib-incline-dumbbell-flyes | Разведения гантелей на наклонной скамье | Incline Dumbbell Flyes | dumbbells | нет папки | нет GIF в манифесте |
| lib-incline-dumbbell-press | Жим гантелей на наклонной скамье | Incline Dumbbell Press | dumbbells | нет папки | нет GIF в манифесте |
| lib-kettlebell-turkish-get-up-lunge-style | Турецкий подъём с гирей | Kettlebell Turkish Get-Up (Lunge style) | kettlebell | нет папки | нет GIF в манифесте |
| lib-leg-extensions | Разгибания ног сидя в тренажёре | Leg Extensions | machine | нет папки | нет GIF в манифесте |
| lib-leg-press | Жим ногами в тренажёре | Leg Press | machine | нет папки | нет GIF в манифесте |
| lib-lying-leg-curls | Сгибания ног лёжа в тренажёре | Lying Leg Curls | machine | нет папки | нет GIF в манифесте |
| lib-machine-bench-press | Жим в тренажёре сидя | Machine Bench Press | machine | нет папки | нет GIF в манифесте |
| lib-one-arm-dumbbell-row | Тяга гантели одной рукой | One-Arm Dumbbell Row | dumbbells | нет папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-row | Тяга гири одной рукой | One-Arm Kettlebell Row | kettlebell | нет папки | нет GIF в манифесте |
| lib-one-legged-cable-kickback | Отведение ноги назад на блоке | One-Legged Cable Kickback | cable | нет папки | нет GIF в манифесте |
| lib-pallof-press | Паллоф-пресс | Pallof Press | cable | нет папки | нет GIF в манифесте |
| lib-preacher-curl | Сгибания на скамье Скотта | Preacher Curl | barbell | нет папки | нет GIF в манифесте |
| lib-pull-through | Протяжка на блоке между ног | Pull Through | cable | нет папки | нет GIF в манифесте |
| lib-reverse-flyes | Разведения гантелей на заднюю дельту | Reverse Flyes | dumbbells | нет папки | нет GIF в манифесте |
| lib-romanian-deadlift | Румынская тяга | Romanian Deadlift | barbell | нет папки | нет GIF в манифесте |
| lib-seated-cable-rows | Тяга горизонтального блока | Seated Cable Rows | cable | нет папки | нет GIF в манифесте |
| lib-seated-calf-raise | Подъёмы на носки сидя | Seated Calf Raise | machine | нет папки | нет GIF в манифесте |
| lib-seated-dumbbell-press | Жим гантелей сидя | Seated Dumbbell Press | dumbbells | нет папки | нет GIF в манифесте |
| lib-seated-leg-curl | Сгибания ног сидя в тренажёре | Seated Leg Curl | machine | нет папки | нет GIF в манифесте |
| lib-side-lateral-raise | Махи гантелями в стороны | Side Lateral Raise | dumbbells | нет папки | нет GIF в манифесте |
| lib-split-squat-with-dumbbells | Приседания в ножницы с гантелями | Split Squat with Dumbbells | dumbbells | нет папки | нет GIF в манифесте |
| lib-standing-barbell-calf-raise | Подъёмы на носки со штангой | Standing Barbell Calf Raise | barbell | нет папки | нет GIF в манифесте |
| lib-standing-biceps-cable-curl | Сгибания рук на нижнем блоке | Standing Biceps Cable Curl | cable | нет папки | нет GIF в манифесте |
| lib-standing-calf-raises | Подъёмы на носки стоя | Standing Calf Raises | machine | нет папки | нет GIF в манифесте |
| lib-standing-dumbbell-triceps-extension | Разгибание гантели из-за головы стоя | Standing Dumbbell Triceps Extension | dumbbells | нет папки | нет GIF в манифесте |
| lib-standing-military-press | Армейский жим стоя | Standing Military Press | barbell | нет папки | нет GIF в манифесте |
| lib-stiff-legged-dumbbell-deadlift | Мёртвая тяга с гантелями на прямых ногах | Stiff-Legged Dumbbell Deadlift | dumbbells | нет папки | нет GIF в манифесте |
| lib-straight-arm-pulldown | Пуловер на блоке прямыми руками | Straight-Arm Pulldown | cable | нет папки | нет GIF в манифесте |
| lib-t-bar-row-with-handle | Тяга Т-грифа с рукоятью | T-Bar Row with Handle | barbell | нет папки | нет GIF в манифесте |
| lib-triceps-pushdown | Разгибания на трицепс на блоке | Triceps Pushdown | cable | нет папки | нет GIF в манифесте |
| lib-upright-barbell-row | Тяга штанги к подбородку | Upright Barbell Row | barbell | нет папки | нет GIF в манифесте |
| lib-vertical-swing | Махи гирей двумя руками | Vertical Swing | dumbbells | нет папки | нет GIF в манифесте |
| lib-wide-grip-lat-pulldown | Тяга верхнего блока широким хватом | Wide-Grip Lat Pulldown | cable | нет папки | нет GIF в манифесте |

## Definition of Done для инвентаризации

- Каждый числовой и каждый `lib-*` ID включён в реестр.
- У каждого ID отдельно отмечены иллюстрация, локальная анимация, источник/лицензия и статус проверки правильности движения.
- Повторное использование ключа не считается подтверждённым совпадением.
- Полное покрытие объявляется только после офлайн-проверки на Android и сверки мужского/женского отображения.
