/**
 * useExerciseReference.ts
 *
 * Stale-while-revalidate wrapper around WgerExerciseService.searchExerciseImage,
 * matching the architecture report's "Local-First Sync" model: the local
 * exercise catalog (WorkoutScreen's WORKOUT_PLAN) stays the source of truth for
 * sets/reps/rest — this only asks wger, in the background, for a reference
 * photo to enrich it with. AsyncStorage (not MMKV — see HANDOFF.md on why
 * MMKV is still deliberately not a dependency here) holds the cross-session
 * cache so the photo shows up instantly on the next app open instead of
 * flashing empty while a network request runs.
 */

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WgerExerciseService, WgerExerciseReference } from '@/services/WgerExerciseService';

const CACHE_PREFIX = 'fitpulse_exercise_ref_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // reference photos don't change week to week

interface CachedEntry {
  reference: WgerExerciseReference | null;
  fetchedAt: number;
}

/**
 * @param searchTerm English exercise name to search wger for (e.g. "Barbell
 *   Squat"), or null to skip the lookup entirely (e.g. no sheet open yet).
 * @param apiToken Optional wger API token — not required for search.
 */
export function useExerciseReference(searchTerm: string | null, apiToken?: string): WgerExerciseReference | null {
  const [reference, setReference] = useState<WgerExerciseReference | null>(null);

  useEffect(() => {
    if (!searchTerm) {
      setReference(null);
      return;
    }

    let cancelled = false;
    const cacheKey = CACHE_PREFIX + searchTerm.toLowerCase();

    async function readCache(): Promise<CachedEntry | null> {
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        return raw ? (JSON.parse(raw) as CachedEntry) : null;
      } catch {
        return null; // corrupt entry — treated as a cache miss, repaired below
      }
    }

    (async () => {
      // 1) Serve whatever's cached immediately, stale or not — this is the
      //    "stale" half of stale-while-revalidate, instant on the UI thread.
      const cached = await readCache();
      if (cancelled) return;
      if (cached) setReference(cached.reference);

      // 2) Revalidate in the background only when missing or past TTL.
      const isStale = !cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS;
      if (!isStale) return;

      try {
        const fresh = await WgerExerciseService.searchExerciseImage(searchTerm, 'en', apiToken);
        if (cancelled) return;
        setReference(fresh);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ reference: fresh, fetchedAt: Date.now() } satisfies CachedEntry));
      } catch {
        // Network/storage failure — keep showing whatever was already set
        // (cached value or null), never surface this as a UI error.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchTerm, apiToken]);

  return reference;
}
