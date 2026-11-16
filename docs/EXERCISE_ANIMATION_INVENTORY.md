# Инвентаризация библиотеки анимаций FitPulse

Снимок исходников: текущее дерево исходников, проверенное этим генератором.
Пересоздать отчёт: node scripts/report-exercise-animation-inventory.mjs --write.

## Итог

- Домашний план: **27** записей упражнений.
- План зала: **39** записей упражнений.
- Всего: **66** записей плана, **66** уникальных числовых ID и **54** уникальных названий.
- Импортированный каталог: **673** упражнений; с русским названием — **673**; с русскими инструкциями — **163**.
- Реестр покрытия: `docs/EXERCISE_ANIMATION_COVERAGE.json` — 739 stable IDs (66 плановых + 673 импортированных), из них 0 одобренных новых анимаций и 739 ещё не выполнено.
- Предварительное группирование: **26** семейств-кандидатов; **160** записей требуют ручной классификации из-за недостатка данных или конфликтов в источнике. Все остальные назначения также непроверенные и не означают одобрение анимации или эквивалентности техники.
- Распределение импортированного каталога по оборудованию: bodyweight: 151; bands: 16; machine: 67; dumbbells: 123; barbell: 170; cable: 81; ez-bar: 9; kettlebell: 56.
- Старые локальные изображения: **96** папок и **192** JPG-кадров. Происхождение по истории импорта — `yuhonas/free-exercise-db`; репозиторий заявляет Unlicense/Public Domain ([LICENSE](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md)), однако права на конкретные JPG, включённые в текущий проект, отдельно не подтверждены. Атрибуция источника сохраняется; права отмечены как непроверенные. Папки, совпавшие с ID импортированного каталога: **96 из 673**.
- GIF-манифест: **58** записей, с localGifPath — **56**; локальных GIF-файлов — **61**; `DATASET_GIF_MODULES` — **61**, `DATASET_THUMB_MODULES` — **61** (всего **122** ссылок на **61** уникальных GIF-файлов).
- GIF-реестр: **3** файлов есть в DATASET_GIF_MODULES, но отсутствуют в манифесте (lib-band-hip-adductions.gif, lib-glute-kickback.gif, lib-side-bridge.gif); **2** записей манифеста не имеют локального файла (lib-butt-lift-bridge.gif, lib-overhead-triceps.gif). DATASET_THUMB_MODULES ссылается на тот же набор уникальных GIF.
- MP4-манифест: **0** записей; общих встроенных MP4-ключей — **12**; профильных MP4-вариантов — **4** для **2** упражнений; профильных PNG-постеров — **4**; всего статических MP4-файлов — **16**.
- В домашних упражнениях **27 из 27** имеют mediaKey, и ключи повторно используются между вариантами. Теперь приложение воспроизводит MP4/GIF только при точном совпадении канонического термина с ключом; похожие варианты без проверенного совпадения не получают чужой ролик. Для упражнений зала mediaKey в плане не задан.

## Отдельный профильный видео-трек (не входит в оригинальное 2D-покрытие)

Профильные рендеры FitPulse Animation Studio учитываются отдельно от 2D-библиотеки. Они уже подключены в мобильном приложении, но не увеличивают число одобренных оригинальных 2D-анимаций.

| Упражнение | Видео | Постеры |
|---|---|---|
| pushup | male, female | male, female |
| pullup | male, female | male, female |

## Исправление назначения медиа после теста на телефоне

- Ранее один mediaKey применялся к нескольким разным движениям: обычные отжимания и узкие/наклонные отжимания; подтягивания и австралийская тяга; выпады и болгарские выпады/зашагивания; планка и скручивания; мостик и отведение ноги назад.
- Теперь встроенное MP4/GIF используется только при точном совпадении канонического английского термина упражнения с назначением медиа-ключа. Похожие названия не считаются эквивалентом.
- Для постера сначала ищется изображение конкретного импортированного ID или точный slug; общий постер разрешён только для канонического термина. Если точного локального материала нет, показывается удалённый постер (когда доступен) или честный fallback, а не чужая техника.
- Это устраняет часть ошибочных назначений, но **не** создаёт анимации для всех упражнений и не подтверждает совместимость пола персонажа с режимом профиля.

## Обнаруженные пробелы и риски

1. Наличие JPG-кадров не означает наличие непрерывной анимации.
2. Разные упражнения могут наследовать один legacy mediaKey, но приложение больше не использует его как достаточное основание для воспроизведения: требуется точное каноническое совпадение термина.
3. Библиотека содержит 673 упражнения, GIF-манифест — 58 записи, а папки JPG покрывают только часть импортированного каталога.
4. Расхождение GIF-реестров: 3 файлов есть в DATASET_GIF_MODULES, но отсутствуют в манифесте (lib-band-hip-adductions.gif, lib-glute-kickback.gif, lib-side-bridge.gif); 2 записей манифеста не имеют локального GIF (lib-butt-lift-bridge.gif, lib-overhead-triceps.gif). Не включать эти упражнения в UI как точные демонстрации без ручной проверки.
5. Источники нужно разделять по лицензии. История импорта связывает JPG-кадры в `assets/exercise-library/` с `yuhonas/free-exercise-db`, чей репозиторий заявляет Unlicense/Public Domain ([LICENSE](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md)); права на конкретные JPG в текущем проекте остаются непроверенными, атрибуция источника сохранена. Для `hasaneyldrm/exercises-dataset` MIT не распространяется на `images/` и `videos/`: эти медиа принадлежат Gym visual, NOTICE устанавливает атрибуцию `© Gym visual — https://gymvisual.com/` и ссылается на условия повторного использования ([LICENSE](https://github.com/hasaneyldrm/exercises-dataset/blob/main/LICENSE), [NOTICE](https://github.com/hasaneyldrm/exercises-dataset/blob/main/NOTICE.md)). Не считать GIF доступными для повторного распространения в APK без отдельной проверки/разрешения; вся новая графика и риг должны быть оригинальными.
6. Текущие MP4/GIF не имеют систематически проверенной мужской/женской пары для каждого упражнения. Реестр явно отмечает половые варианты для всех 739 stable ID, но все 739 записей остаются not-created для новой одобренной анимации.
7. Ручная классификация: **160** записей — **3** с явным конфликтом исходных данных и **157** без безопасного совпадения по названию. Явные конфликты: **Приведение бедра с резинкой** (lib-band-hip-adductions): Название и основные мышцы указывают на приведение, но инструкции описывают отведение ноги наружу. Перед созданием анимации сверить исходную технику. **Махи ногой в сторону лёжа** (lib-side-leg-raises): Инструкция описывает махи ногой в сторону стоя, но поле основных мышц указывает приводящие мышцы. Уточнить направление движения и исправить метаданные. **Махи гирей двумя руками** (lib-vertical-swing): Английская запись указывает гантель, русская инструкция — гирю. Подтвердить оборудование и исправить метаданные до привязки анимации..

## Ключи видео, назначенные упражнениям повторно

| Ключ | Назначений | Упражнения плана |
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

## Предварительные семейства движений (эвристика, нужна ручная проверка)

Кандидатные группы помогают спланировать повторное использование рига, но **не являются утверждённой биомеханической картой** и не считаются анимационным покрытием.

| Семейство-кандидат | Записей | Примеры |
|---|---:|---|
| arm-elbow-extension | 40 | Разгибания на трицепс на блоке (6); Французский жим (46); Разгибания на блоке (47); Разгибание рук на трицепс над головой (lib-overhead-triceps) |
| arm-elbow-flexion | 68 | Сгибания на бицепс со штангой (9); Молотковые сгибания (34); Сгибания со штангой (44); Молотковые сгибания (45) |
| cardio-plyometric | 20 | Захлёст голени двумя ногами (lib-double-leg-butt-kick); Бег на месте высокий темп (lib-fast-skipping); Приседания с выпрыгиванием (lib-freehand-jump-squat); Альпинист с поворотом (гроинеры) (lib-groiners) |
| core-anti-rotation | 2 | Паллоф-пресс (lib-pallof-press); Паллоф-пресс с поворотом (lib-pallof-press-with-rotation) |
| core-candidate-review | 157 | Мельница с гирей (продвинутая) (lib-advanced-kettlebell-windmill); Поперемённые подъёмы на дельты (lib-alternating-deltoid-raise); Попеременный жим с пола (lib-alternating-floor-press); Попеременное взятие на грудь с виса (lib-alternating-hang-clean) |
| core-dynamic-flexion-rotation | 47 | Скручивания (53); Подтягивание коленей на скамье (63); Скручивания на ¾ (lib-3-4-sit-up); Велосипед (пресс) (lib-air-bike) |
| core-pike-hip-flexion | 1 | Подъёмы таза (lib-butt-ups) |
| core-stability-extension | 13 | Планка (15); Мёртвый жук (16); Боковая планка (17); Планка с касанием плеч (54) |
| hip-abduction-balance | 1 | Махи ногой в сторону лёжа (lib-side-leg-raises) |
| hip-extension-bridge | 16 | Ягодичный мостик (20); Ягодичный мостик с опорой (21); Отведение ноги назад (56); Ягодичный мостик (60) |
| hip-flexion-knee-drive | 1 | Сгибание бедра с резинкой (lib-hip-flexion-with-band) |
| hip-frontal-plane-control | 3 | Приведение бедра с резинкой (lib-band-hip-adductions); Приведение бедра на блоке (lib-cable-hip-adduction); Приведение бедра в тренажёре (lib-thigh-adductor) |
| hip-hinge-deadlift | 31 | Становая тяга (2); Румынская тяга (29); Румынская тяга (37); Наклоны с резинкой (гуд морнинг) (lib-band-good-morning) |
| hip-hinge-swing | 2 | Махи гирей двумя руками (lib-vertical-swing); Махи гирей одной рукой (lib-one-arm-kettlebell-swings) |
| horizontal-pull | 35 | Тяга штанги в наклоне (7); Тяга с резиной (12); Тяга гантели в наклоне (24); Тяга гантели в наклоне (26) |
| horizontal-push | 57 | Жим штанги лёжа (4); Отжимания (10); Отжимания от стула (18); Жим гантелей лёжа (23) |
| horizontal-push-lateral-shift | 1 | Изометрические «дворники» (lib-isometric-wipers) |
| lateral-band-walk | 1 | Ходьба с резинкой (монстр-walk) (lib-monster-walk) |
| lower-body-machine-isolation | 24 | Жим ногами (35); Подъёмы на носки (36); Сгибания ног лёжа (39); Подъёмы на носки с резинкой (lib-calf-raises-with-bands) |
| lunge-step-up | 19 | Выпады с гантелями (3); Выпады (14); Выпады с гантелями (30); Обратные выпады (52) |
| mobility-stretch | 53 | Разгибание ноги 90/90 (lib-90-90-hamstring); Растяжка квадрицепса в упоре на четвереньках (lib-all-fours-quad-stretch); Круги бедром лёжа на животе (lib-hip-circles-prone); Изометрия шеи вперёд-назад (lib-isometric-neck-exercise-front-and-back) |
| partner-resisted-isometric-stretch | 4 | Ягодичные лёжа (lib-lying-glute); Сгибание рук на бицепс сидя (lib-seated-biceps); Передняя дельта сидя (lib-seated-front-deltoid); Ягодичные сидя (lib-seated-glute) |
| shoulder-isolation | 54 | Разведение гантелей в стороны (27); Разведения гантелей (32); Разведения на заднюю дельту (38); Махи в стороны (41) |
| squat-knee-dominant | 54 | Приседания со штангой (1); Приседания (13); Приседания со штангой (22); Приседания со штангой (28) |
| vertical-pull | 14 | Тяга верхнего блока (8); Подтягивания (11); Австралийские подтягивания (50); Тяга верхнего блока узким хватом (lib-close-grip-front-lat-pulldown) |
| vertical-push | 21 | Жим гантелей сидя (5); Жим над головой с резиной (19); Армейский жим (40); Отжимания в стойке на руках (lib-handstand-push-ups) |

## Все упражнения домашних и заловых планов

| Режим | ID | Название | mediaKey | Состояние инвентаризации |
|---|---:|---|---|---|
| Зал | 1 | Приседания со штангой | — | Нет прямого встроенного видео-ключа |
| Зал | 2 | Становая тяга | — | Нет прямого встроенного видео-ключа |
| Зал | 3 | Выпады с гантелями | — | Нет прямого встроенного видео-ключа |
| Зал | 4 | Жим штанги лёжа | — | Нет прямого встроенного видео-ключа |
| Зал | 5 | Жим гантелей сидя | — | Нет прямого встроенного видео-ключа |
| Зал | 6 | Разгибания на трицепс на блоке | — | Нет прямого встроенного видео-ключа |
| Зал | 7 | Тяга штанги в наклоне | — | Нет прямого встроенного видео-ключа |
| Зал | 8 | Тяга верхнего блока | — | Нет прямого встроенного видео-ключа |
| Зал | 9 | Сгибания на бицепс со штангой | — | Нет прямого встроенного видео-ключа |
| Домашняя программа | 10 | Отжимания | pushup | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 11 | Подтягивания | pullup | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 12 | Тяга с резиной | row-band | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 13 | Приседания | squat | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 14 | Выпады | lunge | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 15 | Планка | plank | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 16 | Мёртвый жук | dead-bug | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 17 | Боковая планка | side-plank | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 18 | Отжимания от стула | chair-dip | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 19 | Жим над головой с резиной | shoulder-press | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 20 | Ягодичный мостик | glute-bridge | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 21 | Ягодичный мостик с опорой | hip-thrust | Есть ключ; соответствие движению требует проверки |
| Зал | 22 | Приседания со штангой | — | Нет прямого встроенного видео-ключа |
| Зал | 23 | Жим гантелей лёжа | — | Нет прямого встроенного видео-ключа |
| Зал | 24 | Тяга гантели в наклоне | — | Нет прямого встроенного видео-ключа |
| Зал | 25 | Жим штанги лёжа | — | Нет прямого встроенного видео-ключа |
| Зал | 26 | Тяга гантели в наклоне | — | Нет прямого встроенного видео-ключа |
| Зал | 27 | Разведение гантелей в стороны | — | Нет прямого встроенного видео-ключа |
| Зал | 28 | Приседания со штангой | — | Нет прямого встроенного видео-ключа |
| Зал | 29 | Румынская тяга | — | Нет прямого встроенного видео-ключа |
| Зал | 30 | Выпады с гантелями | — | Нет прямого встроенного видео-ключа |
| Зал | 31 | Жим гантелей на наклонной | — | Нет прямого встроенного видео-ключа |
| Зал | 32 | Разведения гантелей | — | Нет прямого встроенного видео-ключа |
| Зал | 33 | Тяга горизонтального блока | — | Нет прямого встроенного видео-ключа |
| Зал | 34 | Молотковые сгибания | — | Нет прямого встроенного видео-ключа |
| Зал | 35 | Жим ногами | — | Нет прямого встроенного видео-ключа |
| Зал | 36 | Подъёмы на носки | — | Нет прямого встроенного видео-ключа |
| Зал | 37 | Румынская тяга | — | Нет прямого встроенного видео-ключа |
| Зал | 38 | Разведения на заднюю дельту | — | Нет прямого встроенного видео-ключа |
| Зал | 39 | Сгибания ног лёжа | — | Нет прямого встроенного видео-ключа |
| Зал | 40 | Армейский жим | — | Нет прямого встроенного видео-ключа |
| Зал | 41 | Махи в стороны | — | Нет прямого встроенного видео-ключа |
| Зал | 42 | Подъёмы перед собой | — | Нет прямого встроенного видео-ключа |
| Зал | 43 | Шраги с гантелями | — | Нет прямого встроенного видео-ключа |
| Зал | 44 | Сгибания со штангой | — | Нет прямого встроенного видео-ключа |
| Зал | 45 | Молотковые сгибания | — | Нет прямого встроенного видео-ключа |
| Зал | 46 | Французский жим | — | Нет прямого встроенного видео-ключа |
| Зал | 47 | Разгибания на блоке | — | Нет прямого встроенного видео-ключа |
| Домашняя программа | 48 | Отжимания узким хватом | pushup | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 49 | Отжимания с возвышения ног | pushup | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 50 | Австралийские подтягивания | pullup | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 51 | Болгарские выпады | lunge | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 52 | Обратные выпады | lunge | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 53 | Скручивания | plank | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 54 | Планка с касанием плеч | plank | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 55 | Отжимания от пола на трицепс | chair-dip | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 56 | Отведение ноги назад | glute-bridge | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 57 | Зашагивания | lunge | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 58 | Приседания | squat | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 59 | Отжимания | pushup | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 60 | Ягодичный мостик | glute-bridge | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 61 | Планка | plank | Есть ключ; соответствие движению требует проверки |
| Домашняя программа | 62 | Выпады | lunge | Есть ключ; соответствие движению требует проверки |
| Зал | 63 | Подтягивание коленей на скамье | — | Нет прямого встроенного видео-ключа |
| Зал | 64 | Сгибания рук с гантелями | — | Нет прямого встроенного видео-ключа |
| Зал | 65 | Фронтальные приседания | — | Нет прямого встроенного видео-ключа |
| Зал | 66 | Тяга гири одной рукой | — | Нет прямого встроенного видео-ключа |

## Полный импортированный каталог

| Stable ID | Название RU | Название EN | Оборудование | JPG-кадры | GIF |
|---|---|---|---|---|---|
| lib-3-4-sit-up | Скручивания на ¾ | 3/4 Sit-Up | bodyweight | 2 JPG | локальный GIF |
| lib-90-90-hamstring | Разгибание ноги 90/90 | 90/90 Hamstring | bodyweight | 2 JPG | нет GIF в манифесте |
| lib-air-bike | Велосипед (пресс) | Air Bike | bodyweight | 2 JPG | локальный GIF |
| lib-all-fours-quad-stretch | Растяжка квадрицепса в упоре на четвереньках | All Fours Quad Stretch | bodyweight | 2 JPG | локальный GIF |
| lib-alternate-heel-touchers | Касания пяток поочерёдно | Alternate Heel Touchers | bodyweight | 2 JPG | локальный GIF |
| lib-band-good-morning | Наклоны с резинкой (гуд морнинг) | Band Good Morning | bands | 2 JPG | локальный GIF |
| lib-band-good-morning-pull-through | Наклоны с резинкой (протяжка) | Band Good Morning (Pull Through) | bands | 2 JPG | локальный GIF |
| lib-band-hip-adductions | Приведение бедра с резинкой | Band Hip Adductions | bands | 2 JPG | нет GIF в манифесте |
| lib-band-pull-apart | Разведение резинки перед собой | Band Pull Apart | bands | 2 JPG | локальный GIF |
| lib-bent-knee-hip-raise | Подъём таза с согнутыми коленями | Bent-Knee Hip Raise | bodyweight | 2 JPG | локальный GIF |
| lib-body-up | Подъём корпуса (боди-ап) | Body-Up | bodyweight | 2 JPG | локальный GIF |
| lib-bodyweight-squat | Приседания с собственным весом | Bodyweight Squat | bodyweight | 2 JPG | локальный GIF |
| lib-bottoms-up | Подъём таза «bottoms up» | Bottoms Up | bodyweight | 2 JPG | локальный GIF |
| lib-butt-ups | Подъёмы таза | Butt-Ups | bodyweight | 2 JPG | локальный GIF |
| lib-butt-lift-bridge | Ягодичный мостик | Butt Lift (Bridge) | bodyweight | 2 JPG | есть в манифесте, локальный файл не найден |
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
| lib-glute-kickback | Махи ногой назад (ягодичные) | Glute Kickback | bodyweight | 2 JPG | нет GIF в манифесте |
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
| lib-overhead-triceps | Разгибание рук на трицепс над головой | Overhead Triceps | bodyweight | 2 JPG | есть в манифесте, локальный файл не найден |
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
| lib-side-bridge | Боковая планка | Side Bridge | bodyweight | 2 JPG | нет GIF в манифесте |
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
| lib-ab-crunch-machine | Скручивания на пресс в тренажёре | Ab Crunch Machine | machine | нет JPG-папки | нет GIF в манифесте |
| lib-alternate-hammer-curl | Молотковые сгибания поочерёдно | Alternate Hammer Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-arnold-dumbbell-press | Жим Арнольда | Arnold Dumbbell Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-bench-press-medium-grip | Жим штанги лёжа (средний хват) | Barbell Bench Press - Medium Grip | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-curl | Сгибания рук со штангой | Barbell Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-deadlift | Становая тяга со штангой | Barbell Deadlift | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-full-squat | Приседания со штангой в полную глубину | Barbell Full Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-glute-bridge | Ягодичный мостик со штангой | Barbell Glute Bridge | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-hip-thrust | Подъём таза со штангой с опорой (хип траст) | Barbell Hip Thrust | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-incline-bench-press-medium-grip | Жим штанги на наклонной скамье | Barbell Incline Bench Press - Medium Grip | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-lunge | Выпады со штангой | Barbell Lunge | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-shrug | Шраги со штангой | Barbell Shrug | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-squat | Приседания со штангой | Barbell Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-bent-over-barbell-row | Тяга штанги в наклоне | Bent Over Barbell Row | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-butterfly | Сведение в тренажёре «бабочка» | Butterfly | machine | нет JPG-папки | нет GIF в манифесте |
| lib-cable-crossover | Кроссовер на блоках | Cable Crossover | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-crunch | Скручивания на блоке стоя | Cable Crunch | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-rope-overhead-triceps-extension | Разгибания на трицепс из-за головы с канатом | Cable Rope Overhead Triceps Extension | cable | нет JPG-папки | нет GIF в манифесте |
| lib-close-grip-barbell-bench-press | Жим штанги узким хватом | Close-Grip Barbell Bench Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-close-grip-front-lat-pulldown | Тяга верхнего блока узким хватом | Close-Grip Front Lat Pulldown | cable | нет JPG-папки | нет GIF в манифесте |
| lib-concentration-curls | Концентрированные сгибания | Concentration Curls | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-decline-barbell-bench-press | Жим штанги на скамье с отрицательным наклоном | Decline Barbell Bench Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-bench-press | Жим гантелей лёжа | Dumbbell Bench Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-bicep-curl | Сгибания рук с гантелями | Dumbbell Bicep Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-flyes | Разведения гантелей лёжа | Dumbbell Flyes | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-lunges | Выпады с гантелями | Dumbbell Lunges | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-shrug | Шраги с гантелями | Dumbbell Shrug | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-ez-bar-skullcrusher | Французский жим с EZ-грифом | EZ-Bar Skullcrusher | ez-bar | нет JPG-папки | нет GIF в манифесте |
| lib-face-pull | Тяга к лицу на блоке с канатом | Face Pull | cable | нет JPG-папки | нет GIF в манифесте |
| lib-front-dumbbell-raise | Подъём гантели перед собой | Front Dumbbell Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-front-squat-clean-grip | Фронтальные приседания (хват «корзинка») | Front Squat (Clean Grip) | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-goblet-squat | Гоблет-приседания с гирей у груди | Goblet Squat | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-good-morning | Наклоны со штангой (гуд морнинг) | Good Morning | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-hack-squat | Гакк-приседания | Hack Squat | machine | нет JPG-папки | нет GIF в манифесте |
| lib-incline-dumbbell-flyes | Разведения гантелей на наклонной скамье | Incline Dumbbell Flyes | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-incline-dumbbell-press | Жим гантелей на наклонной скамье | Incline Dumbbell Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-turkish-get-up-lunge-style | Турецкий подъём с гирей | Kettlebell Turkish Get-Up (Lunge style) | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-leg-extensions | Разгибания ног сидя в тренажёре | Leg Extensions | machine | нет JPG-папки | нет GIF в манифесте |
| lib-leg-press | Жим ногами в тренажёре | Leg Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-lying-leg-curls | Сгибания ног лёжа в тренажёре | Lying Leg Curls | machine | нет JPG-папки | нет GIF в манифесте |
| lib-machine-bench-press | Жим в тренажёре сидя | Machine Bench Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-dumbbell-row | Тяга гантели одной рукой | One-Arm Dumbbell Row | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-row | Тяга гири одной рукой | One-Arm Kettlebell Row | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-legged-cable-kickback | Отведение ноги назад на блоке | One-Legged Cable Kickback | cable | нет JPG-папки | нет GIF в манифесте |
| lib-pallof-press | Паллоф-пресс | Pallof Press | cable | нет JPG-папки | нет GIF в манифесте |
| lib-preacher-curl | Сгибания на скамье Скотта | Preacher Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-pull-through | Протяжка на блоке между ног | Pull Through | cable | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-flyes | Разведения гантелей на заднюю дельту | Reverse Flyes | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-romanian-deadlift | Румынская тяга | Romanian Deadlift | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-seated-cable-rows | Тяга горизонтального блока | Seated Cable Rows | cable | нет JPG-папки | нет GIF в манифесте |
| lib-seated-calf-raise | Подъёмы на носки сидя | Seated Calf Raise | machine | нет JPG-папки | нет GIF в манифесте |
| lib-seated-dumbbell-press | Жим гантелей сидя | Seated Dumbbell Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-leg-curl | Сгибания ног сидя в тренажёре | Seated Leg Curl | machine | нет JPG-папки | нет GIF в манифесте |
| lib-side-lateral-raise | Махи гантелями в стороны | Side Lateral Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-split-squat-with-dumbbells | Приседания в ножницы с гантелями | Split Squat with Dumbbells | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-barbell-calf-raise | Подъёмы на носки со штангой | Standing Barbell Calf Raise | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-standing-biceps-cable-curl | Сгибания рук на нижнем блоке | Standing Biceps Cable Curl | cable | нет JPG-папки | нет GIF в манифесте |
| lib-standing-calf-raises | Подъёмы на носки стоя | Standing Calf Raises | machine | нет JPG-папки | нет GIF в манифесте |
| lib-standing-dumbbell-triceps-extension | Разгибание гантели из-за головы стоя | Standing Dumbbell Triceps Extension | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-military-press | Армейский жим стоя | Standing Military Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-stiff-legged-dumbbell-deadlift | Мёртвая тяга с гантелями на прямых ногах | Stiff-Legged Dumbbell Deadlift | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-straight-arm-pulldown | Пуловер на блоке прямыми руками | Straight-Arm Pulldown | cable | нет JPG-папки | нет GIF в манифесте |
| lib-t-bar-row-with-handle | Тяга Т-грифа с рукоятью | T-Bar Row with Handle | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-triceps-pushdown | Разгибания на трицепс на блоке | Triceps Pushdown | cable | нет JPG-папки | нет GIF в манифесте |
| lib-upright-barbell-row | Тяга штанги к подбородку | Upright Barbell Row | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-vertical-swing | Махи гирей двумя руками | Vertical Swing | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-wide-grip-lat-pulldown | Тяга верхнего блока широким хватом | Wide-Grip Lat Pulldown | cable | нет JPG-папки | нет GIF в манифесте |
| lib-advanced-kettlebell-windmill | Мельница с гирей (продвинутая) | Advanced Kettlebell Windmill | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-alternate-incline-dumbbell-curl | Попеременные сгибания с гантелями на наклонной скамье | Alternate Incline Dumbbell Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-alternating-cable-shoulder-press | Попеременный жим плеч на блоке | Alternating Cable Shoulder Press | cable | нет JPG-папки | нет GIF в манифесте |
| lib-alternating-deltoid-raise | Поперемённые подъёмы на дельты | Alternating Deltoid Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-alternating-floor-press | Попеременный жим с пола | Alternating Floor Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-alternating-hang-clean | Попеременное взятие на грудь с виса | Alternating Hang Clean | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-alternating-kettlebell-press | Попеременный жим с гирями | Alternating Kettlebell Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-alternating-kettlebell-row | Попеременная тяга с гирями | Alternating Kettlebell Row | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-alternating-renegade-row | Попеременная тяга в планке (ренегейт) | Alternating Renegade Row | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-anti-gravity-press | Жим «антигравитационный» | Anti-Gravity Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-around-the-worlds | Круговые разведения вокруг корпуса | Around The Worlds | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-ab-rollout | Прокат штанги (ab rollout) | Barbell Ab Rollout | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-ab-rollout-on-knees | Прокат штанги с колен | Barbell Ab Rollout - On Knees | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-curls-lying-against-an-incline | Сгибания рук со штангой лёжа на наклонной скамье | Barbell Curls Lying Against An Incline | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-guillotine-bench-press | Жим штанги к шее (гильотина) | Barbell Guillotine Bench Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-hack-squat | Гакк-приседания со штангой | Barbell Hack Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-incline-shoulder-raise | Подъёмы штанги на наклонной скамье (передние дельты) | Barbell Incline Shoulder Raise | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-rear-delt-row | Тяга штанги на заднюю дельту | Barbell Rear Delt Row | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-rollout-from-bench | Прокат штанги от скамьи | Barbell Rollout from Bench | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-seated-calf-raise | Подъёмы на носки сидя со штангой | Barbell Seated Calf Raise | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-shoulder-press | Жим штанги над головой | Barbell Shoulder Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-shrug-behind-the-back | Шраги со штангой за спиной | Barbell Shrug Behind The Back | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-side-bend | Наклоны в стороны со штангой | Barbell Side Bend | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-side-split-squat | Боковые приседания в ножницы со штангой | Barbell Side Split Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-squat-to-a-bench | Приседания со штангой до скамьи | Barbell Squat To A Bench | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-step-ups | Зашагивания на платформу со штангой | Barbell Step Ups | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-barbell-walking-lunge | Выпады в движении со штангой | Barbell Walking Lunge | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-bench-press-powerlifting | Жим штанги лёжа (пауэрлифтинг) | Bench Press - Powerlifting | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-bench-press-with-chains | Жим штанги лёжа с цепями | Bench Press with Chains | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-bent-arm-barbell-pullover | Пуловер со штангой на согнутых руках | Bent-Arm Barbell Pullover | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-bent-arm-dumbbell-pullover | Пуловер с гантелью на согнутых руках | Bent-Arm Dumbbell Pullover | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-bent-over-dumbbell-rear-delt-raise-with-head-on-bench | Разведения гантелей на заднюю дельту с головой на скамье | Bent Over Dumbbell Rear Delt Raise With Head On Bench | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-bent-over-low-pulley-side-lateral | Отведения в стороны на нижнем блоке в наклоне | Bent Over Low-Pulley Side Lateral | cable | нет JPG-папки | нет GIF в манифесте |
| lib-bent-over-one-arm-long-bar-row | Тяга длинного грифа одной рукой в наклоне | Bent Over One-Arm Long Bar Row | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-bent-over-two-arm-long-bar-row | Тяга длинного грифа двумя руками в наклоне | Bent Over Two-Arm Long Bar Row | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-bent-over-two-dumbbell-row | Тяга двух гантелей в наклоне | Bent Over Two-Dumbbell Row | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-bent-over-two-dumbbell-row-with-palms-in | Тяга двух гантелей в наклоне нейтральным хватом | Bent Over Two-Dumbbell Row With Palms In | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-bent-press | Бент-пресс (жим наклоном корпуса) | Bent Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-bicycling-stationary | Велотренажёр | Bicycling, Stationary | machine | нет JPG-папки | нет GIF в манифесте |
| lib-board-press | Жим с доской на груди | Board Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-bodyweight-flyes | Разведения в стороны с собственным весом | Bodyweight Flyes | ez-bar | нет JPG-папки | нет GIF в манифесте |
| lib-bosu-ball-cable-crunch-with-side-bends | Скручивания на блоке с наклонами на BOSU | Bosu Ball Cable Crunch With Side Bends | cable | нет JPG-папки | нет GIF в манифесте |
| lib-bottoms-up-clean-from-the-hang-position | Взятие на грудь дном вверх с виса | Bottoms-Up Clean From The Hang Position | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-box-squat | Приседания на ящик | Box Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-box-squat-with-bands | Приседания на ящик с резинами | Box Squat with Bands | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-box-squat-with-chains | Приседания на ящик с цепями | Box Squat with Chains | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-bradford-rocky-presses | Жимы Брэдфорда | Bradford/Rocky Presses | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-cable-chest-press | Жим на грудь на блоке | Cable Chest Press | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-deadlifts | Становая тяга на блоке | Cable Deadlifts | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-hammer-curls-rope-attachment | Молотковые сгибания с канатом на блоке | Cable Hammer Curls - Rope Attachment | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-hip-adduction | Приведение бедра на блоке | Cable Hip Adduction | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-incline-pushdown | Разгибания на наклонной скамье на блоке | Cable Incline Pushdown | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-incline-triceps-extension | Разгибания на трицепс на наклонной скамье с блоком | Cable Incline Triceps Extension | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-internal-rotation | Внутренняя ротация плеча на блоке | Cable Internal Rotation | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-iron-cross | Железный крест на блоках | Cable Iron Cross | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-judo-flip | «Дзюдо-переворот» на блоке | Cable Judo Flip | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-lying-triceps-extension | Разгибания на трицепс лёжа на блоке | Cable Lying Triceps Extension | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-one-arm-tricep-extension | Разгибания на трицепс одной рукой на блоке | Cable One Arm Tricep Extension | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-preacher-curl | Сгибания на блоке на скамье Скотта | Cable Preacher Curl | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-rear-delt-fly | Разведения на заднюю дельту на блоке | Cable Rear Delt Fly | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-reverse-crunch | Обратные скручивания на блоке | Cable Reverse Crunch | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-rope-rear-delt-rows | Тяга каната к лицу на заднюю дельту | Cable Rope Rear-Delt Rows | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-russian-twists | Русский твист на блоке | Cable Russian Twists | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-seated-crunch | Скручивания сидя на блоке | Cable Seated Crunch | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-seated-lateral-raise | Отведения в стороны сидя на блоке | Cable Seated Lateral Raise | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-shoulder-press | Жим плеч на блоке | Cable Shoulder Press | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-shrugs | Шраги на блоке | Cable Shrugs | cable | нет JPG-папки | нет GIF в манифесте |
| lib-cable-wrist-curl | Сгибания запястий на блоке | Cable Wrist Curl | cable | нет JPG-папки | нет GIF в манифесте |
| lib-calf-machine-shoulder-shrug | Шраги в тренажёре для икр | Calf-Machine Shoulder Shrug | machine | нет JPG-папки | нет GIF в манифесте |
| lib-calf-press | Жимы носками | Calf Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-calf-press-on-the-leg-press-machine | Жимы носками в тренажёре для жима ногами | Calf Press On The Leg Press Machine | machine | нет JPG-папки | нет GIF в манифесте |
| lib-calf-raise-on-a-dumbbell | Подъёмы на носок на гантели | Calf Raise On A Dumbbell | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-car-drivers | «Водитель» (руление с весом) | Car Drivers | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-chair-squat | Приседания со стулом | Chair Squat | machine | нет JPG-папки | нет GIF в манифесте |
| lib-clean | Взятие штанги на грудь | Clean | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-clean-deadlift | Становая тяга взятия на грудь | Clean Deadlift | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-clean-pull | Тяга для взятия на грудь | Clean Pull | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-clean-shrug | Шраги-подрыв для взятия на грудь | Clean Shrug | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-clean-and-jerk | Взятие на грудь с толчком | Clean and Jerk | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-clean-and-press | Взятие на грудь с жимом | Clean and Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-clean-from-blocks | Взятие на грудь с блоков | Clean from Blocks | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-close-grip-dumbbell-press | Жим гантелей узким хватом | Close-Grip Dumbbell Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-close-grip-ez-bar-curl-with-band | Сгибания с EZ-грифом узким хватом с резинкой | Close-Grip EZ-Bar Curl with Band | ez-bar | нет JPG-папки | нет GIF в манифесте |
| lib-close-grip-ez-bar-press | Жим EZ-грифа узким хватом | Close-Grip EZ-Bar Press | ez-bar | нет JPG-папки | нет GIF в манифесте |
| lib-close-grip-ez-bar-curl | Сгибания с EZ-грифом узким хватом | Close-Grip EZ Bar Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-close-grip-standing-barbell-curl | Сгибания со штангой узким хватом стоя | Close-Grip Standing Barbell Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-cross-body-hammer-curl | Молотковые сгибания поперёк корпуса | Cross Body Hammer Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-cuban-press | Кубинский жим | Cuban Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-deadlift-with-bands | Становая тяга с резинами | Deadlift with Bands | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-deadlift-with-chains | Становая тяга с цепями | Deadlift with Chains | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-decline-close-grip-bench-to-skull-crusher | Жим узким хватом на наклонной вниз + французский | Decline Close-Grip Bench To Skull Crusher | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-decline-dumbbell-bench-press | Жим гантелей на скамье с отрицательным наклоном | Decline Dumbbell Bench Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-decline-dumbbell-flyes | Разведения гантелей на скамье с отрицательным наклоном | Decline Dumbbell Flyes | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-decline-dumbbell-triceps-extension | Разгибания с гантелями на наклонной вниз скамье | Decline Dumbbell Triceps Extension | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-decline-ez-bar-triceps-extension | Французский жим с EZ-грифом на наклонной вниз | Decline EZ Bar Triceps Extension | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-decline-smith-press | Жим в тренажёре Смита на наклонной вниз | Decline Smith Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-deficit-deadlift | Становая тяга с дефицитом (с возвышения) | Deficit Deadlift | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-dip-machine | Тренажёр для отжиманий на брусьях | Dip Machine | machine | нет JPG-папки | нет GIF в манифесте |
| lib-double-kettlebell-alternating-hang-clean | Попеременное взятие двух гирь с виса | Double Kettlebell Alternating Hang Clean | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-double-kettlebell-jerk | Толчок двух гирь | Double Kettlebell Jerk | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-double-kettlebell-push-press | Пуш-пресс с двумя гирями | Double Kettlebell Push Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-double-kettlebell-snatch | Рывок двух гирь | Double Kettlebell Snatch | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-double-kettlebell-windmill | Мельница с двумя гирями | Double Kettlebell Windmill | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-drag-curl | Сгибания «драг кёрл» (с протяжкой вдоль корпуса) | Drag Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-alternate-bicep-curl | Поочерёдные сгибания рук с гантелями | Dumbbell Alternate Bicep Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-bench-press-with-neutral-grip | Жим гантелей лёжа нейтральным хватом | Dumbbell Bench Press with Neutral Grip | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-clean | Взятие гантели на грудь | Dumbbell Clean | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-floor-press | Жим гантелей с пола | Dumbbell Floor Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-incline-row | Тяга гантелей на наклонной скамье | Dumbbell Incline Row | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-incline-shoulder-raise | Подъёмы гантелей на наклонной скамье | Dumbbell Incline Shoulder Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-lying-one-arm-rear-lateral-raise | Отведения одной руки лёжа на боку | Dumbbell Lying One-Arm Rear Lateral Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-lying-pronation | Пронация с гантелью лёжа | Dumbbell Lying Pronation | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-lying-rear-lateral-raise | Разведения на заднюю дельту лёжа | Dumbbell Lying Rear Lateral Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-lying-supination | Супинация с гантелью лёжа | Dumbbell Lying Supination | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-one-arm-shoulder-press | Жим гантели одной рукой | Dumbbell One-Arm Shoulder Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-one-arm-triceps-extension | Разгибание гантели одной рукой из-за головы | Dumbbell One-Arm Triceps Extension | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-one-arm-upright-row | Тяга гантели к подбородку одной рукой | Dumbbell One-Arm Upright Row | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-prone-incline-curl | Сгибания с гантелями лёжа на наклонной скамье | Dumbbell Prone Incline Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-raise | Подъёмы гантелей перед собой | Dumbbell Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-rear-lunge | Обратные выпады с гантелями | Dumbbell Rear Lunge | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-scaption | Подъёмы «скапция» (Y-подъёмы с гантелями) | Dumbbell Scaption | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-seated-box-jump | Прыжки на тумбу с гантелями (из сидячего) | Dumbbell Seated Box Jump | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-seated-one-leg-calf-raise | Подъёмы на носок сидя с гантелью на одной ноге | Dumbbell Seated One-Leg Calf Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-shoulder-press | Жим гантелей над головой | Dumbbell Shoulder Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-side-bend | Наклоны в стороны с гантелью | Dumbbell Side Bend | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-squat | Приседания с гантелями | Dumbbell Squat | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-squat-to-a-bench | Приседания с гантелями до скамьи | Dumbbell Squat To A Bench | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-step-ups | Зашагивания на платформу с гантелями | Dumbbell Step Ups | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-dumbbell-tricep-extension-pronated-grip | Разгибания на трицепс с гантелью пронированным хватом | Dumbbell Tricep Extension -Pronated Grip | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-ez-bar-curl | Сгибания рук с EZ-грифом | EZ-Bar Curl | ez-bar | нет JPG-папки | нет GIF в манифесте |
| lib-elevated-back-lunge | Обратные выпады с возвышения | Elevated Back Lunge | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-elevated-cable-rows | Тяга на блоке с возвышения | Elevated Cable Rows | cable | нет JPG-папки | нет GIF в манифесте |
| lib-elliptical-trainer | Эллиптический тренажёр | Elliptical Trainer | machine | нет JPG-папки | нет GIF в манифесте |
| lib-extended-range-one-arm-kettlebell-floor-press | Жим гири одной рукой с пола с расширенной амплитудой | Extended Range One-Arm Kettlebell Floor Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-external-rotation | Наружная ротация плеча | External Rotation | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-external-rotation-with-cable | Наружная ротация плеча на блоке | External Rotation with Cable | cable | нет JPG-папки | нет GIF в манифесте |
| lib-finger-curls | Сгибания пальцев | Finger Curls | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-flat-bench-cable-flyes | Разведения на блоке лёжа | Flat Bench Cable Flyes | cable | нет JPG-папки | нет GIF в манифесте |
| lib-flexor-incline-dumbbell-curls | Сгибания сгибателей на наклонной скамье с гантелями | Flexor Incline Dumbbell Curls | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-floor-press | Жим с пола | Floor Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-floor-press-with-chains | Жим с пола с цепями | Floor Press with Chains | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-frankenstein-squat | Приседания «Франкенштейн» (гриф на дельтах) | Frankenstein Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-front-barbell-squat | Фронтальные приседания со штангой | Front Barbell Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-front-barbell-squat-to-a-bench | Фронтальные приседания со штангой до скамьи | Front Barbell Squat To A Bench | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-front-cable-raise | Подъёмы на блоке перед собой | Front Cable Raise | cable | нет JPG-папки | нет GIF в манифесте |
| lib-front-incline-dumbbell-raise | Подъёмы гантелей перед собой на наклонной скамье | Front Incline Dumbbell Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-front-raise-and-pullover | Подъём перед собой с переходом в пуловер | Front Raise And Pullover | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-front-squats-with-two-kettlebells | Фронтальные приседания с двумя гирями | Front Squats With Two Kettlebells | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-front-two-dumbbell-raise | Подъёмы двух гантелей перед собой | Front Two-Dumbbell Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-full-range-of-motion-lat-pulldown | Тяга верхнего блока с полной амплитудой | Full Range-Of-Motion Lat Pulldown | cable | нет JPG-папки | нет GIF в манифесте |
| lib-glute-ham-raise | Глют-хэм (разгибание со сгибанием ног) | Glute Ham Raise | machine | нет JPG-папки | нет GIF в манифесте |
| lib-good-morning-off-pins | Гуд морнинг с пинов | Good Morning off Pins | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-hammer-curls | Молотковые сгибания с гантелями | Hammer Curls | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-hammer-grip-incline-db-bench-press | Жим гантелей на наклонной скамье (молотковый хват) | Hammer Grip Incline DB Bench Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-hang-clean | Взятие на грудь с виса | Hang Clean | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-hang-clean-below-the-knees | Взятие на грудь с виса ниже колен | Hang Clean - Below the Knees | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-hang-snatch | Рывок с виса | Hang Snatch | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-hang-snatch-below-knees | Рывок с виса ниже колен | Hang Snatch - Below Knees | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-hanging-bar-good-morning | Гуд морнинг в висе на перекладине | Hanging Bar Good Morning | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-heaving-snatch-balance | Рывковый баланс с отправкой | Heaving Snatch Balance | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-high-cable-curls | Сгибания на верхнем блоке | High Cable Curls | cable | нет JPG-папки | нет GIF в манифесте |
| lib-incline-barbell-triceps-extension | Французский жим штанги на наклонной скамье | Incline Barbell Triceps Extension | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-incline-bench-pull | Тяга штанги лёжа на наклонной скамье (к пояснице) | Incline Bench Pull | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-incline-cable-chest-press | Жим на грудь на блоке с наклонной скамьи | Incline Cable Chest Press | cable | нет JPG-папки | нет GIF в манифесте |
| lib-incline-cable-flye | Разведения на блоке на наклонной скамье | Incline Cable Flye | cable | нет JPG-папки | нет GIF в манифесте |
| lib-incline-dumbbell-bench-with-palms-facing-in | Жим гантелей на наклонной скамье ладонями внутрь | Incline Dumbbell Bench With Palms Facing In | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-incline-dumbbell-curl | Сгибания с гантелями на наклонной скамье | Incline Dumbbell Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-incline-dumbbell-flyes-with-a-twist | Разведения гантелей на наклонной скамье с поворотом | Incline Dumbbell Flyes - With A Twist | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-incline-hammer-curls | Молотковые сгибания на наклонной скамье | Incline Hammer Curls | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-incline-inner-biceps-curl | Сгибания на внутреннюю головку бицепса на наклонной скамье | Incline Inner Biceps Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-iron-cross | Железный крест (с гантелями) | Iron Cross | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-jm-press | JM-жим | JM Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-jefferson-squats | Приседания Джефферсона (гриф между ног) | Jefferson Squats | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-jerk-balance | Баланс толчка | Jerk Balance | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-jerk-dip-squat | Подсед под толчок | Jerk Dip Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-jogging-treadmill | Бег трусцой на дорожке | Jogging, Treadmill | machine | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-arnold-press | Жим Арнольда с гирей | Kettlebell Arnold Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-dead-clean | Взятие гири на грудь с пола | Kettlebell Dead Clean | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-figure-8 | Восьмёрка с гирей | Kettlebell Figure 8 | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-halo | Гало с гирей (круг вокруг головы) | Kettlebell Halo | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-halo-with-overhead-extension | Гало с гирей с разгибанием над головой | Kettlebell Halo with Overhead Extension | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-hang-clean | Взятие гири на грудь с виса | Kettlebell Hang Clean | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-one-legged-deadlift | Становая тяга с гирей на одной ноге | Kettlebell One-Legged Deadlift | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-overhead-triceps-extension | Разгибания на трицепс с гирей из-за головы | Kettlebell Overhead Triceps Extension | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-pass-between-the-legs | Передача гири между ног | Kettlebell Pass Between The Legs | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-pirate-ships | «Пиратский корабль» (качание с гирей) | Kettlebell Pirate Ships | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-pistol-squat | Пистолетик с гирей | Kettlebell Pistol Squat | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-seated-press | Жим гири сидя | Kettlebell Seated Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-seesaw-press | Попеременный жим гирь («качели») | Kettlebell Seesaw Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-sumo-high-pull | Сумо-тяга гири к подбородку | Kettlebell Sumo High Pull | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-thruster | Трастер с гирей | Kettlebell Thruster | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-turkish-get-up-squat-style | Турецкий подъём с гирей (через присед) | Kettlebell Turkish Get-Up (Squat style) | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kettlebell-windmill | Мельница с гирей | Kettlebell Windmill | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-kneeling-cable-crunch-with-alternating-oblique-twists | Скручивания на блоке с колен с поворотами на косые | Kneeling Cable Crunch With Alternating Oblique Twists | cable | нет JPG-папки | нет GIF в манифесте |
| lib-kneeling-cable-triceps-extension | Разгибания на трицепс на блоке с колен | Kneeling Cable Triceps Extension | cable | нет JPG-папки | нет GIF в манифесте |
| lib-kneeling-high-pulley-row | Тяга верхнего блока с колен | Kneeling High Pulley Row | cable | нет JPG-папки | нет GIF в манифесте |
| lib-kneeling-jump-squat | Прыжок в присед с колен | Kneeling Jump Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-kneeling-single-arm-high-pulley-row | Тяга верхнего блока одной рукой с колен | Kneeling Single-Arm High Pulley Row | cable | нет JPG-папки | нет GIF в манифесте |
| lib-kneeling-squat | Приседания на коленях | Kneeling Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-landmine-180s | Повороты с landmine-грифом на 180° | Landmine 180's | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-landmine-linear-jammer | Толчок landmine-грифа по прямой | Landmine Linear Jammer | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-leg-over-floor-press | Жим с пола с перешагиванием ноги | Leg-Over Floor Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-leverage-chest-press | Жим в рычажном тренажёре | Leverage Chest Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-leverage-deadlift | Становая тяга в рычажном тренажёре | Leverage Deadlift | machine | нет JPG-папки | нет GIF в манифесте |
| lib-leverage-decline-chest-press | Жим в рычажном тренажёре с отрицательным наклоном | Leverage Decline Chest Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-leverage-high-row | Высокая тяга в рычажном тренажёре | Leverage High Row | machine | нет JPG-папки | нет GIF в манифесте |
| lib-leverage-incline-chest-press | Жим на наклонной в рычажном тренажёре | Leverage Incline Chest Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-leverage-iso-row | Изолированная тяга в рычажном тренажёре | Leverage Iso Row | machine | нет JPG-папки | нет GIF в манифесте |
| lib-leverage-shoulder-press | Жим плеч в рычажном тренажёре | Leverage Shoulder Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-leverage-shrug | Шраги в рычажном тренажёре | Leverage Shrug | machine | нет JPG-папки | нет GIF в манифесте |
| lib-low-cable-crossover | Кроссовер на нижнем блоке | Low Cable Crossover | cable | нет JPG-папки | нет GIF в манифесте |
| lib-low-cable-triceps-extension | Разгибания на трицепс на нижнем блоке | Low Cable Triceps Extension | cable | нет JPG-папки | нет GIF в манифесте |
| lib-low-pulley-row-to-neck | Тяга нижнего блока к шее | Low Pulley Row To Neck | cable | нет JPG-папки | нет GIF в манифесте |
| lib-lunge-pass-through | Выпад с проводкой гири под ногой | Lunge Pass Through | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-lunge-sprint | Спринт-выпады | Lunge Sprint | machine | нет JPG-папки | нет GIF в манифесте |
| lib-lying-cable-curl | Сгибания рук лёжа на блоке | Lying Cable Curl | cable | нет JPG-папки | нет GIF в манифесте |
| lib-lying-cambered-barbell-row | Тяга изогнутого грифа лёжа | Lying Cambered Barbell Row | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-lying-close-grip-bar-curl-on-high-pulley | Сгибания со штангой узким хватом лёжа на верхнем блоке | Lying Close-Grip Bar Curl On High Pulley | cable | нет JPG-папки | нет GIF в манифесте |
| lib-lying-close-grip-barbell-triceps-extension-behind-the-head | Французский жим узким хватом из-за головы лёжа | Lying Close-Grip Barbell Triceps Extension Behind The Head | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-lying-close-grip-barbell-triceps-press-to-chin | Жим узким хватом к подбородку лёжа | Lying Close-Grip Barbell Triceps Press To Chin | ez-bar | нет JPG-папки | нет GIF в манифесте |
| lib-lying-dumbbell-tricep-extension | Разгибания с гантелями лёжа | Lying Dumbbell Tricep Extension | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-lying-high-bench-barbell-curl | Сгибания со штангой лёжа на высокой скамье | Lying High Bench Barbell Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-lying-machine-squat | Приседания в тренажёре лёжа | Lying Machine Squat | machine | нет JPG-папки | нет GIF в манифесте |
| lib-lying-one-arm-lateral-raise | Отведения в сторону одной рукой лёжа | Lying One-Arm Lateral Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-lying-rear-delt-raise | Подъёмы на заднюю дельту лёжа | Lying Rear Delt Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-lying-supine-dumbbell-curl | Сгибания с гантелями лёжа на спине | Lying Supine Dumbbell Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-lying-t-bar-row | Тяга Т-грифа лёжа | Lying T-Bar Row | machine | нет JPG-папки | нет GIF в манифесте |
| lib-lying-triceps-press | Французский жим лёжа | Lying Triceps Press | ez-bar | нет JPG-папки | нет GIF в манифесте |
| lib-machine-bicep-curl | Сгибания на бицепс в тренажёре | Machine Bicep Curl | machine | нет JPG-папки | нет GIF в манифесте |
| lib-machine-preacher-curls | Сгибания в тренажёре на скамье Скотта | Machine Preacher Curls | machine | нет JPG-папки | нет GIF в манифесте |
| lib-machine-shoulder-military-press | Армейский жим в тренажёре | Machine Shoulder (Military) Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-machine-triceps-extension | Разгибания на трицепс в тренажёре | Machine Triceps Extension | machine | нет JPG-папки | нет GIF в манифесте |
| lib-middle-back-shrug | Шраги средним отделом спины | Middle Back Shrug | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-muscle-snatch | Мышечный рывок (без подседа) | Muscle Snatch | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-narrow-stance-hack-squats | Гакк-приседания узкой стойкой | Narrow Stance Hack Squats | machine | нет JPG-папки | нет GIF в манифесте |
| lib-narrow-stance-leg-press | Жим ногами узкой постановкой | Narrow Stance Leg Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-narrow-stance-squats | Приседания узкой стойкой | Narrow Stance Squats | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-neck-press | Жим к шее | Neck Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-olympic-squat | Олимпийские приседания | Olympic Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-flat-bench-dumbbell-flye | Разведения с гантелью одной рукой лёжа | One-Arm Flat Bench Dumbbell Flye | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-high-pulley-cable-side-bends | Наклоны в стороны на верхнем блоке одной рукой | One-Arm High-Pulley Cable Side Bends | cable | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-incline-lateral-raise | Отведения в стороны одной рукой на наклонной скамье | One-Arm Incline Lateral Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-clean | Взятие гири на грудь одной рукой | One-Arm Kettlebell Clean | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-clean-and-jerk | Взятие гири на грудь с толчком одной рукой | One-Arm Kettlebell Clean and Jerk | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-floor-press | Жим гири одной рукой с пола | One-Arm Kettlebell Floor Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-jerk | Толчок гири одной рукой | One-Arm Kettlebell Jerk | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-military-press-to-the-side | Жим гири одной рукой в сторону | One-Arm Kettlebell Military Press To The Side | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-para-press | Пара-жим гири одной рукой | One-Arm Kettlebell Para Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-push-press | Пуш-пресс с гирей одной рукой | One-Arm Kettlebell Push Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-snatch | Рывок гири одной рукой | One-Arm Kettlebell Snatch | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-split-jerk | Толчок гири в ножницы одной рукой | One-Arm Kettlebell Split Jerk | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-split-snatch | Рывок гири в ножницы одной рукой | One-Arm Kettlebell Split Snatch | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-kettlebell-swings | Махи гирей одной рукой | One-Arm Kettlebell Swings | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-long-bar-row | Тяга длинного грифа одной рукой | One-Arm Long Bar Row | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-open-palm-kettlebell-clean | Взятие гири на грудь открытой ладонью | One-Arm Open Palm Kettlebell Clean | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-overhead-kettlebell-squats | Приседания с гирей над головой одной рукой | One-Arm Overhead Kettlebell Squats | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-side-deadlift | Боковая становая тяга одной рукой | One-Arm Side Deadlift | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-side-laterals | Отведения в стороны одной рукой | One-Arm Side Laterals | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-dumbbell-bench-press | Жим гантели одной рукой лёжа | One Arm Dumbbell Bench Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-dumbbell-preacher-curl | Сгибания с гантелью на скамье Скотта одной рукой | One Arm Dumbbell Preacher Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-floor-press | Жим одной рукой с пола | One Arm Floor Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-lat-pulldown | Тяга верхнего блока одной рукой | One Arm Lat Pulldown | cable | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-pronated-dumbbell-triceps-extension | Разгибания гантели одной рукой пронированным хватом | One Arm Pronated Dumbbell Triceps Extension | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-supinated-dumbbell-triceps-extension | Разгибания гантели одной рукой супинированным хватом | One Arm Supinated Dumbbell Triceps Extension | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-one-leg-barbell-squat | Приседания со штангой на одной ноге | One Leg Barbell Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-open-palm-kettlebell-clean | Взятие гирь на грудь открытыми ладонями | Open Palm Kettlebell Clean | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-overhead-cable-curl | Сгибания на блоке из-за головы | Overhead Cable Curl | cable | нет JPG-папки | нет GIF в манифесте |
| lib-overhead-squat | Приседания со штангой над головой | Overhead Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-pallof-press-with-rotation | Паллоф-пресс с поворотом | Pallof Press With Rotation | cable | нет JPG-папки | нет GIF в манифесте |
| lib-palms-down-dumbbell-wrist-curl-over-a-bench | Сгибания запястий с гантелей ладонями вниз через скамью | Palms-Down Dumbbell Wrist Curl Over A Bench | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-palms-down-wrist-curl-over-a-bench | Сгибания запястий ладонями вниз через скамью | Palms-Down Wrist Curl Over A Bench | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-palms-up-barbell-wrist-curl-over-a-bench | Сгибания запястий со штангой ладонями вверх через скамью | Palms-Up Barbell Wrist Curl Over A Bench | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-palms-up-dumbbell-wrist-curl-over-a-bench | Сгибания запястий с гантелей ладонями вверх через скамью | Palms-Up Dumbbell Wrist Curl Over A Bench | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-pin-presses | Жимы с пинов | Pin Presses | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-plie-dumbbell-squat | Плие-приседания с гантелью | Plie Dumbbell Squat | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-plyo-kettlebell-pushups | Плиометрические отжимания на гирях | Plyo Kettlebell Pushups | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-power-clean | Взятие на грудь без подседа (power clean) | Power Clean | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-power-clean-from-blocks | Взятие на грудь с блоков (power) | Power Clean from Blocks | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-power-jerk | Толчок без выпада (power jerk) | Power Jerk | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-power-partials | Частичные подъёмы (power partials) | Power Partials | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-power-snatch | Рывок без подседа (power snatch) | Power Snatch | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-power-snatch-from-blocks | Рывок с блоков (power) | Power Snatch from Blocks | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-preacher-hammer-dumbbell-curl | Молотковые сгибания с гантелью на скамье Скотта | Preacher Hammer Dumbbell Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-press-sit-up | Скручивания с жимом | Press Sit-Up | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-push-press | Жим с толчком ног (пуш-пресс) | Push Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-push-press-behind-the-neck | Пуш-пресс из-за головы | Push Press - Behind the Neck | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-rack-delivery | Съём штанги со стойки (rack delivery) | Rack Delivery | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-rack-pull-with-bands | Тяга с плинтов с резинами | Rack Pull with Bands | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-rack-pulls | Тяга с плинтов | Rack Pulls | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-recumbent-bike | Лежачий велотренажёр | Recumbent Bike | machine | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-band-bench-press | Жим лёжа с демпфирующими резинами | Reverse Band Bench Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-band-box-squat | Приседания на ящик с демпфирующими резинами | Reverse Band Box Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-band-deadlift | Становая тяга с демпфирующими резинами | Reverse Band Deadlift | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-band-power-squat | Силовые приседания с демпфирующими резинами | Reverse Band Power Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-band-sumo-deadlift | Сумо-становая с демпфирующими резинами | Reverse Band Sumo Deadlift | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-barbell-curl | Обратные сгибания со штангой | Reverse Barbell Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-barbell-preacher-curls | Обратные сгибания со штангой на скамье Скотта | Reverse Barbell Preacher Curls | ez-bar | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-cable-curl | Обратные сгибания на блоке | Reverse Cable Curl | cable | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-flyes-with-external-rotation | Разведения на заднюю дельту с наружной ротацией | Reverse Flyes With External Rotation | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-grip-bent-over-rows | Тяга в наклоне обратным хватом | Reverse Grip Bent-Over Rows | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-grip-triceps-pushdown | Разгибания на блоке обратным хватом | Reverse Grip Triceps Pushdown | cable | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-hyperextension | Обратная гиперэкстензия | Reverse Hyperextension | machine | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-machine-flyes | Обратные разведения в тренажёре | Reverse Machine Flyes | machine | нет JPG-папки | нет GIF в манифесте |
| lib-reverse-triceps-bench-press | Жим лёжа обратным хватом на трицепс | Reverse Triceps Bench Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-rocking-standing-calf-raise | Покачивающиеся подъёмы на носки стоя | Rocking Standing Calf Raise | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-romanian-deadlift-from-deficit | Румынская тяга с возвышения | Romanian Deadlift from Deficit | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-rope-crunch | Скручивания с канатом на блоке | Rope Crunch | cable | нет JPG-папки | нет GIF в манифесте |
| lib-rope-straight-arm-pulldown | Пуловер на блоке прямыми руками с канатом | Rope Straight-Arm Pulldown | cable | нет JPG-папки | нет GIF в манифесте |
| lib-rowing-stationary | Гребной тренажёр | Rowing, Stationary | machine | нет JPG-папки | нет GIF в манифесте |
| lib-running-treadmill | Бег на беговой дорожке | Running, Treadmill | machine | нет JPG-папки | нет GIF в манифесте |
| lib-seated-barbell-military-press | Армейский жим штанги сидя | Seated Barbell Military Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-seated-barbell-twist | Повороты корпуса со штангой сидя | Seated Barbell Twist | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-seated-bent-over-one-arm-dumbbell-triceps-extension | Разгибания гантели одной рукой в наклоне сидя | Seated Bent-Over One-Arm Dumbbell Triceps Extension | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-bent-over-rear-delt-raise | Подъёмы на заднюю дельту в наклоне сидя | Seated Bent-Over Rear Delt Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-bent-over-two-arm-dumbbell-triceps-extension | Разгибания гантелей двумя руками в наклоне сидя | Seated Bent-Over Two-Arm Dumbbell Triceps Extension | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-cable-shoulder-press | Жим плеч на блоке сидя | Seated Cable Shoulder Press | cable | нет JPG-папки | нет GIF в манифесте |
| lib-seated-close-grip-concentration-barbell-curl | Концентрированные сгибания со штангой узким хватом сидя | Seated Close-Grip Concentration Barbell Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-seated-dumbbell-curl | Сгибания с гантелями сидя | Seated Dumbbell Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-dumbbell-inner-biceps-curl | Сгибания на внутреннюю головку бицепса сидя | Seated Dumbbell Inner Biceps Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-dumbbell-palms-down-wrist-curl | Сгибания запястий с гантелями ладонями вниз сидя | Seated Dumbbell Palms-Down Wrist Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-dumbbell-palms-up-wrist-curl | Сгибания запястий с гантелями ладонями вверх сидя | Seated Dumbbell Palms-Up Wrist Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-good-mornings | Гуд морнинги сидя | Seated Good Mornings | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-seated-one-arm-dumbbell-palms-down-wrist-curl | Сгибания запястий с гантелью одной рукой ладонями вниз сидя | Seated One-Arm Dumbbell Palms-Down Wrist Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-one-arm-dumbbell-palms-up-wrist-curl | Сгибания запястий с гантелью одной рукой ладонями вверх сидя | Seated One-Arm Dumbbell Palms-Up Wrist Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-one-arm-cable-pulley-rows | Тяга нижнего блока одной рукой сидя | Seated One-arm Cable Pulley Rows | cable | нет JPG-папки | нет GIF в манифесте |
| lib-seated-palm-up-barbell-wrist-curl | Сгибания запястий со штангой ладонями вверх сидя | Seated Palm-Up Barbell Wrist Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-seated-palms-down-barbell-wrist-curl | Сгибания запястий со штангой ладонями вниз сидя | Seated Palms-Down Barbell Wrist Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-seated-side-lateral-raise | Отведения в стороны сидя | Seated Side Lateral Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-triceps-press | Жим на трицепс сидя | Seated Triceps Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-seated-two-arm-palms-up-low-pulley-wrist-curl | Сгибания запястий на нижнем блоке ладонями вверх сидя | Seated Two-Arm Palms-Up Low-Pulley Wrist Curl | cable | нет JPG-папки | нет GIF в манифесте |
| lib-see-saw-press-alternating-side-press | Попеременный боковой жим («качели») | See-Saw Press (Alternating Side Press) | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-shotgun-row | Тяга «дробовик» | Shotgun Row | cable | нет JPG-папки | нет GIF в манифесте |
| lib-side-laterals-to-front-raise | Отведения в стороны с переходом в подъём перед собой | Side Laterals to Front Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-single-arm-cable-crossover | Кроссовер одной рукой на блоке | Single-Arm Cable Crossover | cable | нет JPG-папки | нет GIF в манифесте |
| lib-single-arm-linear-jammer | Толчок по прямой одной рукой | Single-Arm Linear Jammer | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-single-leg-leg-extension | Разгибания ног сидя на одной ноге | Single-Leg Leg Extension | machine | нет JPG-папки | нет GIF в манифесте |
| lib-single-dumbbell-raise | Подъёмы одной гантели перед собой | Single Dumbbell Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-smith-incline-shoulder-raise | Подъёмы в тренажёре Смита на наклонной | Smith Incline Shoulder Raise | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-behind-the-back-shrug | Шраги в тренажёре Смита за спиной | Smith Machine Behind the Back Shrug | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-bench-press | Жим лёжа в тренажёре Смита | Smith Machine Bench Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-bent-over-row | Тяга в наклоне в тренажёре Смита | Smith Machine Bent Over Row | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-calf-raise | Подъёмы на носки в тренажёре Смита | Smith Machine Calf Raise | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-close-grip-bench-press | Жим узким хватом в тренажёре Смита | Smith Machine Close-Grip Bench Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-decline-press | Жим на наклонной вниз в тренажёре Смита | Smith Machine Decline Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-hang-power-clean | Взятие на грудь с виса в тренажёре Смита | Smith Machine Hang Power Clean | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-hip-raise | Подъём таза в тренажёре Смита | Smith Machine Hip Raise | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-incline-bench-press | Жим на наклонной скамье в тренажёре Смита | Smith Machine Incline Bench Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-leg-press | Жим ногами в тренажёре Смита | Smith Machine Leg Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-one-arm-upright-row | Тяга к подбородку одной рукой в тренажёре Смита | Smith Machine One-Arm Upright Row | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-overhead-shoulder-press | Жим над головой в тренажёре Смита | Smith Machine Overhead Shoulder Press | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-pistol-squat | Пистолетик в тренажёре Смита | Smith Machine Pistol Squat | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-reverse-calf-raises | Обратные подъёмы на носки в тренажёре Смита | Smith Machine Reverse Calf Raises | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-squat | Приседания в тренажёре Смита | Smith Machine Squat | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-stiff-legged-deadlift | Мёртвая тяга на прямых ногах в тренажёре Смита | Smith Machine Stiff-Legged Deadlift | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-machine-upright-row | Тяга к подбородку в тренажёре Смита | Smith Machine Upright Row | machine | нет JPG-папки | нет GIF в манифесте |
| lib-smith-single-leg-split-squat | Приседания в ножницы на одной ноге в тренажёре Смита | Smith Single-Leg Split Squat | machine | нет JPG-папки | нет GIF в манифесте |
| lib-snatch | Рывок штанги | Snatch | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-snatch-balance | Рывковый баланс | Snatch Balance | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-snatch-deadlift | Становая тяга рывка | Snatch Deadlift | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-snatch-pull | Тяга рывка | Snatch Pull | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-snatch-shrug | Шраги рывковым хватом | Snatch Shrug | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-snatch-from-blocks | Рывок с блоков | Snatch from Blocks | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-speed-box-squat | Скоростные приседания на ящик | Speed Box Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-speed-squats | Скоростные приседания | Speed Squats | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-spell-caster | «Чародей» (дуги с гирей перед собой) | Spell Caster | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-spider-curl | Сгибания «паук» | Spider Curl | ez-bar | нет JPG-папки | нет GIF в манифесте |
| lib-split-clean | Взятие на грудь в ножницы | Split Clean | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-split-jerk | Толчок в ножницы | Split Jerk | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-split-snatch | Рывок в ножницы | Split Snatch | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-squat-jerk | Толчок с подседом | Squat Jerk | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-squat-with-bands | Приседания с резинами | Squat with Bands | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-squat-with-chains | Приседания с цепями | Squat with Chains | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-squat-with-plate-movers | Приседания с блином (plate movers) | Squat with Plate Movers | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-stairmaster | Степпер-лестница (Stairmaster) | Stairmaster | machine | нет JPG-папки | нет GIF в манифесте |
| lib-standing-alternating-dumbbell-press | Попеременный жим гантелей стоя | Standing Alternating Dumbbell Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-barbell-press-behind-neck | Жим штанги из-за головы стоя | Standing Barbell Press Behind Neck | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-standing-bent-over-one-arm-dumbbell-triceps-extension | Разгибания гантели одной рукой в наклоне стоя | Standing Bent-Over One-Arm Dumbbell Triceps Extension | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-bent-over-two-arm-dumbbell-triceps-extension | Разгибания гантелей двумя руками в наклоне стоя | Standing Bent-Over Two-Arm Dumbbell Triceps Extension | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-bradford-press | Жим Брэдфорда стоя | Standing Bradford Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-standing-cable-chest-press | Жим на грудь на блоке стоя | Standing Cable Chest Press | cable | нет JPG-папки | нет GIF в манифесте |
| lib-standing-cable-lift | Подъём на блоке стоя (диагональ) | Standing Cable Lift | cable | нет JPG-папки | нет GIF в манифесте |
| lib-standing-cable-wood-chop | «Рубка дров» на блоке стоя | Standing Cable Wood Chop | cable | нет JPG-папки | нет GIF в манифесте |
| lib-standing-concentration-curl | Концентрированные сгибания стоя | Standing Concentration Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-dumbbell-calf-raise | Подъёмы на носки с гантелями стоя | Standing Dumbbell Calf Raise | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-dumbbell-press | Жим гантелей стоя | Standing Dumbbell Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-dumbbell-reverse-curl | Обратные сгибания с гантелями стоя | Standing Dumbbell Reverse Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-dumbbell-straight-arm-front-delt-raise-above-head | Подъёмы прямых рук с гантелями над головой | Standing Dumbbell Straight-Arm Front Delt Raise Above Head | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-dumbbell-upright-row | Тяга гантелей к подбородку стоя | Standing Dumbbell Upright Row | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-front-barbell-raise-over-head | Подъём штанги перед собой над головой | Standing Front Barbell Raise Over Head | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-standing-inner-biceps-curl | Сгибания на внутреннюю головку бицепса стоя | Standing Inner-Biceps Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-leg-curl | Сгибания ног стоя в тренажёре | Standing Leg Curl | machine | нет JPG-папки | нет GIF в манифесте |
| lib-standing-low-pulley-deltoid-raise | Подъёмы на дельты на нижнем блоке стоя | Standing Low-Pulley Deltoid Raise | cable | нет JPG-папки | нет GIF в манифесте |
| lib-standing-low-pulley-one-arm-triceps-extension | Разгибания на трицепс одной рукой на нижнем блоке стоя | Standing Low-Pulley One-Arm Triceps Extension | cable | нет JPG-папки | нет GIF в манифесте |
| lib-standing-one-arm-cable-curl | Сгибания на блоке одной рукой стоя | Standing One-Arm Cable Curl | cable | нет JPG-папки | нет GIF в манифесте |
| lib-standing-one-arm-dumbbell-curl-over-incline-bench | Сгибания с гантелью одной рукой через наклонную скамью | Standing One-Arm Dumbbell Curl Over Incline Bench | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-one-arm-dumbbell-triceps-extension | Разгибания гантели из-за головы одной рукой стоя | Standing One-Arm Dumbbell Triceps Extension | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-overhead-barbell-triceps-extension | Французский жим штанги стоя | Standing Overhead Barbell Triceps Extension | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-standing-palm-in-one-arm-dumbbell-press | Жим гантели одной рукой нейтральным хватом стоя | Standing Palm-In One-Arm Dumbbell Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-palms-in-dumbbell-press | Жим гантелей нейтральным хватом стоя | Standing Palms-In Dumbbell Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-standing-palms-up-barbell-behind-the-back-wrist-curl | Сгибания запястий со штангой за спиной ладонями вверх | Standing Palms-Up Barbell Behind The Back Wrist Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-standing-rope-crunch | Скручивания с канатом стоя | Standing Rope Crunch | cable | нет JPG-папки | нет GIF в манифесте |
| lib-step-mill | Степ-милл (лестница) | Step Mill | machine | нет JPG-папки | нет GIF в манифесте |
| lib-stiff-legged-barbell-deadlift | Мёртвая тяга со штангой на прямых ногах | Stiff-Legged Barbell Deadlift | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-stiff-leg-barbell-good-morning | Гуд морнинг на прямых ногах со штангой | Stiff Leg Barbell Good Morning | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-straight-arm-dumbbell-pullover | Пуловер с гантелью прямыми руками | Straight-Arm Dumbbell Pullover | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-straight-bar-bench-mid-rows | Тяга прямым грифом к поясу | Straight Bar Bench Mid Rows | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-straight-raises-on-incline-bench | Прямые подъёмы на наклонной скамье | Straight Raises on Incline Bench | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-sumo-deadlift | Сумо-становая тяга | Sumo Deadlift | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-sumo-deadlift-with-bands | Сумо-становая тяга с резинами | Sumo Deadlift with Bands | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-sumo-deadlift-with-chains | Сумо-становая тяга с цепями | Sumo Deadlift with Chains | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-tate-press | Жим Тейта | Tate Press | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-thigh-abductor | Отведение бедра в тренажёре | Thigh Abductor | machine | нет JPG-папки | нет GIF в манифесте |
| lib-thigh-adductor | Приведение бедра в тренажёре | Thigh Adductor | machine | нет JPG-папки | нет GIF в манифесте |
| lib-tricep-dumbbell-kickback | Отведения гантели назад на трицепс | Tricep Dumbbell Kickback | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-triceps-overhead-extension-with-rope | Разгибания на трицепс из-за головы с канатом | Triceps Overhead Extension with Rope | cable | нет JPG-папки | нет GIF в манифесте |
| lib-triceps-pushdown-rope-attachment | Разгибания на трицепс на блоке с канатом | Triceps Pushdown - Rope Attachment | cable | нет JPG-папки | нет GIF в манифесте |
| lib-triceps-pushdown-v-bar-attachment | Разгибания на трицепс на блоке с V-рукоятью | Triceps Pushdown - V-Bar Attachment | cable | нет JPG-папки | нет GIF в манифесте |
| lib-two-arm-dumbbell-preacher-curl | Сгибания с гантелями на скамье Скотта | Two-Arm Dumbbell Preacher Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-two-arm-kettlebell-clean | Взятие двух гирь на грудь | Two-Arm Kettlebell Clean | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-two-arm-kettlebell-jerk | Толчок двух гирь | Two-Arm Kettlebell Jerk | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-two-arm-kettlebell-military-press | Армейский жим с двумя гирями | Two-Arm Kettlebell Military Press | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-two-arm-kettlebell-row | Тяга двух гирь | Two-Arm Kettlebell Row | kettlebell | нет JPG-папки | нет GIF в манифесте |
| lib-underhand-cable-pulldowns | Тяга верхнего блока обратным хватом | Underhand Cable Pulldowns | cable | нет JPG-папки | нет GIF в манифесте |
| lib-upright-cable-row | Тяга к подбородку на блоке | Upright Cable Row | cable | нет JPG-папки | нет GIF в манифесте |
| lib-v-bar-pulldown | Тяга верхнего блока V-рукоятью | V-Bar Pulldown | cable | нет JPG-папки | нет GIF в манифесте |
| lib-walking-treadmill | Ходьба на беговой дорожке | Walking, Treadmill | machine | нет JPG-папки | нет GIF в манифесте |
| lib-weighted-jump-squat | Прыжковые приседания с весом | Weighted Jump Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-weighted-sissy-squat | Сисси-приседания с весом | Weighted Sissy Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-wide-grip-barbell-bench-press | Жим штанги лёжа широким хватом | Wide-Grip Barbell Bench Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-wide-grip-decline-barbell-bench-press | Жим штанги широким хватом на наклонной вниз | Wide-Grip Decline Barbell Bench Press | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-wide-grip-decline-barbell-pullover | Пуловер со штангой широким хватом на наклонной вниз | Wide-Grip Decline Barbell Pullover | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-wide-grip-pulldown-behind-the-neck | Тяга верхнего блока за голову широким хватом | Wide-Grip Pulldown Behind The Neck | cable | нет JPG-папки | нет GIF в манифесте |
| lib-wide-grip-standing-barbell-curl | Сгибания со штангой широким хватом стоя | Wide-Grip Standing Barbell Curl | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-wide-stance-barbell-squat | Приседания со штангой в широкой стойке | Wide Stance Barbell Squat | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-wide-stance-stiff-legs | Становая на прямых ногах в широкой стойке | Wide Stance Stiff Legs | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-wrist-rotations-with-straight-bar | Вращения запястий с прямым грифом | Wrist Rotations with Straight Bar | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-zercher-squats | Приседания Церхера | Zercher Squats | barbell | нет JPG-папки | нет GIF в манифесте |
| lib-zottman-curl | Сгибания Зоттмана | Zottman Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-zottman-preacher-curl | Сгибания Зоттмана на скамье Скотта | Zottman Preacher Curl | dumbbells | нет JPG-папки | нет GIF в манифесте |
| lib-adductor-groin | Растяжка приводящих (пах) | Adductor/Groin | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-alternate-leg-diagonal-bound | Диагональные прыжки со сменой ног | Alternate Leg Diagonal Bound | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-ankle-on-the-knee | Голеностоп на колене (растяжка ягодичной) | Ankle On The Knee | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-arm-circles | Вращения руками | Arm Circles | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-bodyweight-walking-lunge | Выпады шагом | Bodyweight Walking Lunge | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-calf-stretch-elbows-against-wall | Растяжка икр у стены (на предплечьях) | Calf Stretch Elbows Against Wall | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-calf-stretch-hands-against-wall | Растяжка икр у стены (руками) | Calf Stretch Hands Against Wall | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-carioca-quick-step | Кариока (бег с перекрёстными шагами) | Carioca Quick Step | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-cat-stretch | «Кошка» (растяжка спины) | Cat Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-childs-pose | Поза ребёнка | Child's Pose | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-chin-to-chest-stretch | Подбородок к груди | Chin To Chest Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-crossover-reverse-lunge | Обратный выпад с поворотом корпуса | Crossover Reverse Lunge | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-dancers-stretch | Растяжка танцовщика | Dancer's Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-dynamic-back-stretch | Динамическая растяжка спины | Dynamic Back Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-dynamic-chest-stretch | Динамическая растяжка грудных мышц | Dynamic Chest Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-elbow-circles | Вращения локтями | Elbow Circles | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-elbows-back | Локти назад (растяжка грудных) | Elbows Back | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-floor-glute-ham-raise | Сгибания ног на полу (с партнёром) | Floor Glute-Ham Raise | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-frog-hops | Прыжки лягушкой | Frog Hops | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-groin-and-back-stretch | Растяжка паха и спины | Groin and Back Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-hamstring-stretch | Растяжка задней поверхности бедра | Hamstring Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-hug-knees-to-chest | Обхват коленей (колени к груди) | Hug Knees To Chest | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-iron-crosses-stretch | «Крест» лёжа (растяжка спины) | Iron Crosses (stretch) | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-knee-across-the-body | Колено через корпус (растяжка) | Knee Across The Body | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-kneeling-arm-drill | Махи руками с колена (спринт-дрилл) | Kneeling Arm Drill | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-kneeling-forearm-stretch | Растяжка предплечья на коленях | Kneeling Forearm Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-kneeling-hip-flexor | Растяжка сгибателей бедра на колене | Kneeling Hip Flexor | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-leg-up-hamstring-stretch | Растяжка задней поверхности бедра с ногой вверх | Leg-Up Hamstring Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-linear-3-part-start-technique | Трёхшаговый старт (спринт-техника) | Linear 3-Part Start Technique | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-linear-acceleration-wall-drill | Ускорение у стены (спринт-дрилл) | Linear Acceleration Wall Drill | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-looking-at-ceiling | Прогиб назад на коленях | Looking At Ceiling | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-middle-back-stretch | Растяжка середины спины | Middle Back Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-mountain-climbers | «Альпинисты» (бег в упоре) | Mountain Climbers | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-moving-claw-series | «Коготь» в движении (спринт-дрилл) | Moving Claw Series | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-on-your-side-quad-stretch | Растяжка квадрицепса на боку | On Your Side Quad Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-one-arm-against-wall | Рука у стены (растяжка широчайших) | One Arm Against Wall | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-one-half-locust | Полукузнечик (поза саранчи) | One Half Locust | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-one-knee-to-chest | Одно колено к груди | One Knee To Chest | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-overhead-stretch | Растяжка над головой | Overhead Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-pelvic-tilt-into-bridge | Мостик с наклоном таза | Pelvic Tilt Into Bridge | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-prone-manual-hamstring | Растяжка бицепса бедра лёжа (с партнёром) | Prone Manual Hamstring | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-runners-stretch | Растяжка бегуна | Runner's Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-seated-calf-stretch | Растяжка икр сидя | Seated Calf Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-seated-floor-hamstring-stretch | Складка сидя на полу | Seated Floor Hamstring Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-seated-hamstring | Растяжка сидя (с партнёром) | Seated Hamstring | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-seated-overhead-stretch | Растяжка вверх сидя | Seated Overhead Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-shoulder-circles | Вращения плечами | Shoulder Circles | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-shoulder-raise | Подъёмы плеч (разминка) | Shoulder Raise | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-shoulder-stretch | Растяжка плеч | Shoulder Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-side-lying-floor-stretch | Растяжка лёжа на боку | Side-Lying Floor Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-side-lying-groin-stretch | Растяжка приводящих лёжа на боку | Side Lying Groin Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-side-neck-stretch | Растяжка шеи в сторону | Side Neck Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-side-standing-long-jump | Прыжки в длину в сторону | Side Standing Long Jump | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-side-wrist-pull | Тяга запястья поперёк корпуса | Side Wrist Pull | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-sit-squats | Приседания с паузой | Sit Squats | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-split-squats | Сплит-приседания | Split Squats | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-standing-gastrocnemius-calf-stretch | Растяжка икроножной мышцы стоя | Standing Gastrocnemius Calf Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-standing-hip-flexors | Растяжка сгибателей бедра стоя | Standing Hip Flexors | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-standing-lateral-stretch | Боковая растяжка стоя | Standing Lateral Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-standing-pelvic-tilt | Наклон таза стоя | Standing Pelvic Tilt | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-standing-soleus-and-achilles-stretch | Растяжка камбаловидной и ахиллова сухожилия | Standing Soleus And Achilles Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-standing-toe-touches | Касания носков стоя | Standing Toe Touches | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-the-straddle | Широкая складка (уголком) | The Straddle | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-trail-running-walking | Бег или ходьба по пересечённой местности | Trail Running/Walking | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-tricep-side-stretch | Растяжка трицепса вбок | Tricep Side Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-triceps-stretch | Растяжка трицепса | Triceps Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-upper-back-leg-grab | Обхват бёдер сидя (складка) | Upper Back-Leg Grab | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-upper-back-stretch | Растяжка верха спины | Upper Back Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-upward-stretch | Растяжка вверх стоя | Upward Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-windmills | «Мельница» (наклоны в стороны) | Windmills | bodyweight | нет JPG-папки | нет GIF в манифесте |
| lib-worlds-greatest-stretch | Выпад с разворотом («лучшая растяжка») | World's Greatest Stretch | bodyweight | нет JPG-папки | нет GIF в манифесте |

## Критерии готовности

- Каждый числовой ID и каждый lib-* ID учтён.
- Для каждой записи раздельно отмечены иллюстрация, локальная анимация, источник/лицензия и статус проверки движения.
- Повторное использование одного ключа явно видно; оно не считается доказательством правильной демонстрации.
- Полное покрытие утверждается только после сверки всех ID, файлов, мужского/женского варианта и офлайн-проигрывания на Android.
