import { libIdForNumericId } from './importedExerciseBridge';

export type PremiumExerciseMotion =
  | 'pull-up'
  | 'bench-leg-pull-in'
  | 'bicep-curl'
  | 'front-squat'
  | 'one-arm-kettlebell-row';

const MOTION_BY_LIBRARY_ID: Record<string, PremiumExerciseMotion> = {
  'lib-flat-bench-leg-pull-in': 'bench-leg-pull-in',
  'lib-dumbbell-bicep-curl': 'bicep-curl',
  'lib-front-squat-clean-grip': 'front-squat',
  'lib-one-arm-kettlebell-row': 'one-arm-kettlebell-row'
};

function normalizeTerm(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Use exact reviewed identity. Never fuzzy-match by substring or shared muscle group. */
export function premiumMotionForExercise(
  id: number,
  wgerSearchTerm?: string
): PremiumExerciseMotion | undefined {
  if (id === 11 && ['pull up', 'pull ups'].includes(normalizeTerm(wgerSearchTerm))) {
    return 'pull-up';
  }

  const libraryId = libIdForNumericId(id);
  return libraryId ? MOTION_BY_LIBRARY_ID[libraryId] : undefined;
}
