/**
 * warmup.ts
 *
 * Разминочные комплексы перед тренировкой (P1 из разбора Forma-Google-studio,
 * clean-room: структура и подход к выбору рутины по целевым мышцам взяты
 * как концепция; данные переписаны, без маркетинговых обещаний вроде
 * «снижает риск травм на 85%»).
 *
 * Модуль чистый (без RN-импортов) — легко тестируется. Данные двуязычные,
 * чтобы не раздувать strings.ts на ~60 ключей описаний.
 */

import type { MuscleKey } from '@/domain/muscleKeys';

export type WarmupKey = 'legs' | 'push' | 'pull' | 'fullbody';

export interface Bilingual {
  ru: string;
  en: string;
}

export interface WarmupExercise {
  id: string;
  name: Bilingual;
  /** Длительность шага в секундах. */
  durationSec: number;
  description: Bilingual;
  focusRegion: Bilingual;
}

export interface WarmupRoutine {
  key: WarmupKey;
  title: Bilingual;
  exercises: WarmupExercise[];
}

export const WARMUP_ROUTINES: Record<WarmupKey, WarmupRoutine> = {
  legs: {
    key: 'legs',
    title: {
      ru: 'Мобильность ног и тазобедренных суставов',
      en: 'Legs and hip mobility'
    },
    exercises: [
      {
        id: 'leg-1',
        name: {
          ru: 'Вращения тазобедренных суставов наружу и внутрь',
          en: 'Hip circles outward and inward'
        },
        durationSec: 45,
        description: {
          ru: 'Разработка суставной жидкости и связок таза перед приседаниями',
          en: 'Warms up hip joints and ligaments before squats'
        },
        focusRegion: { ru: 'Тазобедренный сустав', en: 'Hip joint' }
      },
      {
        id: 'leg-2',
        name: {
          ru: 'Динамические выпады с растяжкой сгибателей бедра',
          en: 'Dynamic lunges with hip flexor stretch'
        },
        durationSec: 60,
        description: {
          ru: 'Раскрытие паховых связок и активация квадрицепса',
          en: 'Opens the groin and activates the quads'
        },
        focusRegion: { ru: 'Квадрицепс и сгибатели', en: 'Quads and hip flexors' }
      },
      {
        id: 'leg-3',
        name: {
          ru: 'Ягодичный мостик с паузой вверху 2 секунды',
          en: 'Glute bridge with a 2-second pause at the top'
        },
        durationSec: 45,
        description: {
          ru: 'Включение ягодичных мышц для защиты поясницы',
          en: 'Engages the glutes to protect the lower back'
        },
        focusRegion: { ru: 'Ягодицы', en: 'Glutes' }
      },
      {
        id: 'leg-4',
        name: {
          ru: 'Глубокий присед с раскрытием грудного отдела',
          en: 'Deep squat with an open chest'
        },
        durationSec: 60,
        description: {
          ru: 'Мобильность голеностопного сустава и расслабление поясницы',
          en: 'Ankle mobility and lower-back release'
        },
        focusRegion: { ru: 'Голеностоп и позвоночник', en: 'Ankles and spine' }
      }
    ]
  },
  push: {
    key: 'push',
    title: {
      ru: 'Мобильность плечевого пояса и грудной клетки',
      en: 'Shoulder girdle and chest mobility'
    },
    exercises: [
      {
        id: 'push-1',
        name: {
          ru: 'Круговые вращения плечами с махами',
          en: 'Arm circles with swings'
        },
        durationSec: 45,
        description: {
          ru: 'Разогрев ротаторной манжеты плеча',
          en: 'Warms up the shoulder rotator cuff'
        },
        focusRegion: { ru: 'Плечевые суставы', en: 'Shoulder joints' }
      },
      {
        id: 'push-2',
        name: {
          ru: 'Динамическое раскрытие грудной клетки у стены',
          en: 'Dynamic chest opener at the wall'
        },
        durationSec: 45,
        description: {
          ru: 'Растяжка малых и больших грудных мышц',
          en: 'Stretches the pectoral muscles'
        },
        focusRegion: { ru: 'Грудные мышцы', en: 'Chest' }
      },
      {
        id: 'push-3',
        name: {
          ru: 'Планка с касанием противоположного плеча',
          en: 'Plank with opposite-shoulder taps'
        },
        durationSec: 60,
        description: {
          ru: 'Активация мышц-стабилизаторов кора и зубчатых мышц',
          en: 'Activates core stabilizers and serratus'
        },
        focusRegion: { ru: 'Кор и дельты', en: 'Core and delts' }
      }
    ]
  },
  pull: {
    key: 'pull',
    title: {
      ru: 'Мобильность позвоночника и мышц спины',
      en: 'Spine and back mobility'
    },
    exercises: [
      {
        id: 'pull-1',
        name: {
          ru: '«Кошка-корова» для позвоночника',
          en: 'Cat-cow for the spine'
        },
        durationSec: 60,
        description: {
          ru: 'Мягкая артикуляция каждого позвонка и мобилизация грудного отдела',
          en: 'Gentle articulation of each vertebra, upper-back mobilization'
        },
        focusRegion: { ru: 'Позвоночник', en: 'Spine' }
      },
      {
        id: 'pull-2',
        name: {
          ru: 'Растяжка широчайших мышц в наклоне с опорой',
          en: 'Lat stretch in a supported hinge'
        },
        durationSec: 45,
        description: {
          ru: 'Подготовка широчайших и ромбовидных мышц к тяговым движениям',
          en: 'Preps the lats and rhomboids for pulling'
        },
        focusRegion: { ru: 'Широчайшие мышцы', en: 'Lats' }
      },
      {
        id: 'pull-3',
        name: {
          ru: 'Y-T-W подъёмы рук лёжа на животе',
          en: 'Prone Y-T-W raises'
        },
        durationSec: 60,
        description: {
          ru: 'Активация трапециевидных мышц и задних дельт',
          en: 'Activates the traps and rear delts'
        },
        focusRegion: { ru: 'Верх спины', en: 'Upper back' }
      }
    ]
  },
  fullbody: {
    key: 'fullbody',
    title: {
      ru: 'Комплексная разминка всего тела',
      en: 'Full-body warm-up'
    },
    exercises: [
      {
        id: 'full-1',
        name: {
          ru: 'Суставная гимнастика сверху вниз',
          en: 'Joint circles from head to toe'
        },
        durationSec: 60,
        description: {
          ru: 'Разогрев шеи, плеч, локтей и коленей',
          en: 'Warms up the neck, shoulders, elbows and knees'
        },
        focusRegion: { ru: 'Все суставы', en: 'All joints' }
      },
      {
        id: 'full-2',
        name: {
          ru: '«Мельница» и боковые динамические наклоны',
          en: 'Windmills and dynamic side bends'
        },
        durationSec: 45,
        description: {
          ru: 'Активация косых мышц живота и задней поверхности бедра',
          en: 'Activates the obliques and hamstrings'
        },
        focusRegion: { ru: 'Кор и бицепс бедра', en: 'Core and hamstrings' }
      },
      {
        id: 'full-3',
        name: {
          ru: 'Приседания с поворотом корпуса вверху',
          en: 'Squats with a rotation at the top'
        },
        durationSec: 60,
        description: {
          ru: 'Синхронизация работы ног и ротации корпуса',
          en: 'Syncs the legs with torso rotation'
        },
        focusRegion: { ru: 'Ноги и корпус', en: 'Legs and torso' }
      },
      {
        id: 'full-4',
        name: {
          ru: 'Лёгкий бег на месте с высокими коленями',
          en: 'Light high-knees running in place'
        },
        durationSec: 45,
        description: {
          ru: 'Подъем пульса до целевой разминочной зоны (110–120 уд/мин)',
          en: 'Raises the pulse into the warm-up zone (110–120 bpm)'
        },
        focusRegion: { ru: 'Сердечно-сосудистая система', en: 'Cardio' }
      }
    ]
  }
};

/**
 * Принадлежность мышц к группам рутины. «core» сознательно не входит ни в
 * одну группу: день из одних статических кор-упражнений — это fullbody.
 */
export const WARMUP_GROUP_MUSCLES: Record<Exclude<WarmupKey, 'fullbody'>, readonly MuscleKey[]> = {
  legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['back', 'biceps', 'lowerback']
};

/** Детерминированный порядок разрешения ничьих. */
const GROUP_ORDER: readonly Exclude<WarmupKey, 'fullbody'>[] = ['legs', 'push', 'pull'];

/**
 * Выбор разминочного комплекса по целевым мышцам дня (все упражнения,
 * включая кастомные тренировки). Побеждает группа с максимумом совпадений;
 * при ничьей — фиксированный порядок legs → push → pull; пусто → fullbody.
 */
export function selectWarmupRoutine(muscles: readonly MuscleKey[]): WarmupKey {
  const counts = new Map<Exclude<WarmupKey, 'fullbody'>, number>();
  for (const m of muscles) {
    for (const g of GROUP_ORDER) {
      if (WARMUP_GROUP_MUSCLES[g].includes(m)) {
        counts.set(g, (counts.get(g) ?? 0) + 1);
      }
    }
  }
  let best: WarmupKey = 'fullbody';
  let bestCount = 0;
  for (const g of GROUP_ORDER) {
    const c = counts.get(g) ?? 0;
    if (c > bestCount) {
      best = g;
      bestCount = c;
    }
  }
  return best;
}

/** Суммарная длительность комплекса в секундах. */
export function warmupRoutineTotalSec(routine: WarmupRoutine): number {
  return routine.exercises.reduce((acc, e) => acc + e.durationSec, 0);
}
