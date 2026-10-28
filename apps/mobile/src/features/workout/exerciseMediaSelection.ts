export type ExercisePresentation = 'male' | 'female';

type VariantMap<T> = Partial<Record<string, Partial<Record<ExercisePresentation, T>>>>;
type FallbackMap<T> = Partial<Record<string, T>>;

/**
 * FitPulse's generated clips describe only the base exercises. Plan IDs 48/49
 * are close-grip and feet-elevated push-ups, not the standard push-up.
 */
export function isCanonicalProfileAnimationExercise(
  exerciseId: number,
  mediaKey: string | null | undefined
): boolean {
  if (mediaKey === 'pushup') return exerciseId === 10 || exerciseId === 59;
  if (mediaKey === 'pullup') return exerciseId === 11;
  return false;
}

/** Resolve profile-specific media, defaulting an unset/unknown profile to male. */
export function resolveProfileExerciseMedia<T>(
  mediaKey: string | null | undefined,
  profileSex: unknown,
  variants: VariantMap<T>,
  fallback: FallbackMap<T>
): T | undefined {
  if (!mediaKey) return undefined;
  const presentation: ExercisePresentation = profileSex === 'female' ? 'female' : 'male';
  return variants[mediaKey]?.[presentation] ?? fallback[mediaKey];
}
