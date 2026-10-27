export type ExercisePresentation = 'male' | 'female';

type VariantMap<T> = Partial<Record<string, Partial<Record<ExercisePresentation, T>>>>;
type FallbackMap<T> = Partial<Record<string, T>>;

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
