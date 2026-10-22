import type { Sex } from '@/engines/MetabolicEngine';
import { premiumMotionForExercise, type PremiumExerciseMotion } from './exercisePremiumMapping';

type SexAssets = Record<PremiumExerciseMotion, number>;

const PREMIUM_GIFS: Record<'male' | 'female', SexAssets> = {
  male: {
    'pull-up': require('../../../assets/premium-exercises/male/pull-up.gif'),
    'bench-leg-pull-in': require('../../../assets/premium-exercises/male/bench-leg-pull-in.gif'),
    'bicep-curl': require('../../../assets/premium-exercises/male/bicep-curl.gif'),
    'front-squat': require('../../../assets/premium-exercises/male/front-squat.gif'),
    'one-arm-kettlebell-row': require('../../../assets/premium-exercises/male/one-arm-kettlebell-row.gif')
  },
  female: {
    'pull-up': require('../../../assets/premium-exercises/female/pull-up.gif'),
    'bench-leg-pull-in': require('../../../assets/premium-exercises/female/bench-leg-pull-in.gif'),
    'bicep-curl': require('../../../assets/premium-exercises/female/bicep-curl.gif'),
    'front-squat': require('../../../assets/premium-exercises/female/front-squat.gif'),
    'one-arm-kettlebell-row': require('../../../assets/premium-exercises/female/one-arm-kettlebell-row.gif')
  }
};

export function premiumExerciseGifFor(
  exercise: { id: number; wgerSearchTerm?: string },
  sex: Sex | null | undefined
): number | undefined {
  if (sex !== 'male' && sex !== 'female') return undefined;
  const motion = premiumMotionForExercise(exercise.id, exercise.wgerSearchTerm);
  return motion ? PREMIUM_GIFS[sex][motion] : undefined;
}
