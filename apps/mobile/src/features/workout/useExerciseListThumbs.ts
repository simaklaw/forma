/**
 * useExerciseListThumbs.ts
 *
 * Фото-превью для тайлов списка дня, у которых нет бандл-медиа (gym-план: 35/35
 * без mediaKey — issue #173). Использует ТЕ ЖЕ ключи кэша AsyncStorage, что и
 * useExerciseReference ('fitpulse_exercise_ref_*'): фото, подтянутое для тайла,
 * мгновенно доступно шторке упражнения — и наоборот. Без сети или при промахе
 * wger тайл остаётся на заглушке с инициалами (issue #171), никогда чёрным.
 */

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WgerExerciseService,
  type WgerExerciseReference
} from '@/services/WgerExerciseService';

const CACHE_PREFIX = 'fitpulse_exercise_ref_';

interface CachedEntry {
  reference: WgerExerciseReference | null;
  fetchedAt: number;
}

/** Из списка дня нужен только wgerSearchTerm. */
type ThumbTarget = { id: number; wgerSearchTerm?: string };

async function cachedImageUrl(searchTerm: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + searchTerm.toLowerCase());
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    return entry.reference?.imageUrl ?? null;
  } catch {
    return null;
  }
}

/** Кэш URL фото wger по id упражнения (общий кэш с useExerciseReference). */
export function useExerciseListThumbs(exercises: ThumbTarget[]): Record<number, string> {
  const [urls, setUrls] = useState<Record<number, string>>({});
  const cacheKey = exercises.map((ex) => ex.id).join(',');

  useEffect(() => {
    let cancelled = false;
    const targets = exercises.filter((ex) => ex.wgerSearchTerm);
    if (targets.length === 0) return;

    void (async () => {
      const next: Record<number, string> = {};
      await Promise.all(
        targets.map(async (ex) => {
          const term = ex.wgerSearchTerm!;
          const cached = await cachedImageUrl(term);
          if (cached) {
            next[ex.id] = cached;
            return;
          }
          try {
            const fresh = await WgerExerciseService.searchExerciseImage(term, 'en');
            if (!fresh?.imageUrl) return;
            next[ex.id] = fresh.imageUrl;
            await AsyncStorage.setItem(
              CACHE_PREFIX + term.toLowerCase(),
              JSON.stringify({ reference: fresh, fetchedAt: Date.now() } satisfies CachedEntry)
            );
          } catch {
            // Оффлайн или wger недоступен — тайл остаётся на заглушке с инициалами.
          }
        })
      );
      if (!cancelled) setUrls(next);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return urls;
}
