export type ProfileDraft = {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  gender: 'male' | 'female' | null;
};

/** App-boundary check before domain (BMR / MET / session). Domain stays strict. */
export function isProfileComplete(p: ProfileDraft): boolean {
  return (
    Number.isFinite(p.weightKg) &&
    (p.weightKg as number) > 0 &&
    Number.isFinite(p.heightCm) &&
    (p.heightCm as number) > 0 &&
    Number.isFinite(p.age) &&
    (p.age as number) > 0 &&
    (p.gender === 'male' || p.gender === 'female')
  );
}
