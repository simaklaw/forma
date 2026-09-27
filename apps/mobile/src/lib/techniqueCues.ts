/** Split plan notes into short technique steps for the in-app guide. */

export function techniqueCuesFromNote(note: string | undefined | null): string[] {
  if (!note || !note.trim()) return [];
  const parts = note
    .split(/[.;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
  return parts.slice(0, 6);
}

export function formatRestClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
